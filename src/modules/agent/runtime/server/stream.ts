import {
  createError,
  defineEventHandler,
  readBody,
  useRuntimeConfig,
} from '#imports'
import { provider, models, skills } from '#blokkli-build/agent-server'
import { FieldStreamParser, type ParserEvent } from './streamParser'
import { resolveTemplate, type TemplateCall } from './templates'
import { validateToken, getDefaultModel, createUsageTurn } from './helpers'
import type { UsageTurn } from '../shared/types'

const config = useRuntimeConfig()
const authSecret = config.blokkli?.agent?.authSecret || ''
const apiKey = config.blokkli?.agent?.apiKey || ''

/**
 * Write an SSE event to the response.
 */
function writeSSE(
  res: { write: (data: string) => void },
  event: string,
  data: unknown,
): void {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { authToken, template, templateParams, model, fields, pageContext } =
    body as {
      authToken?: string
      template?: string
      templateParams?: Record<string, unknown>
      model?: string
      fields?: Array<{
        uuid: string
        fieldName: string
        currentValue: string
        fieldType: 'plain' | 'markup'
      }>
      pageContext?: Record<string, unknown>
    }

  // Validate required fields.
  if (!authToken || !template || !fields?.length) {
    throw createError({
      statusCode: 400,
      message: 'Missing required fields: authToken, template, fields',
    })
  }

  if (!authSecret || !validateToken(authToken, authSecret)) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  if (!apiKey) {
    throw createError({
      statusCode: 500,
      message: 'API key not configured',
    })
  }

  // Resolve the model to use.
  const resolvedModel = model || models[0]?.name
  if (!resolvedModel) {
    throw createError({
      statusCode: 500,
      message: 'No model configured',
    })
  }

  // Set SSE headers.
  const res = event.node.res
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  })

  // Handle client disconnect.
  const abortController = new AbortController()
  event.node.req.on('close', () => {
    abortController.abort()
  })

  const parser = new FieldStreamParser()

  // Collect additional context from skills that provide stream templates.
  let skillContext: string | undefined
  if (pageContext) {
    const skillContextParts: string[] = []
    for (const skill of skills) {
      if (skill.streamTemplates?.includes(template as never)) {
        const content = skill.getContents(pageContext as never)
        if (content) {
          skillContextParts.push(content)
        }
      }
    }
    if (skillContextParts.length > 0) {
      skillContext = skillContextParts.join('\n\n')
    }
  }

  // Build the prompt server-side from template + params.
  const templateCall = {
    template,
    templateParams: templateParams || {},
  } as TemplateCall

  const { systemPrompt, userMessage } = resolveTemplate(
    templateCall,
    fields,
    skillContext,
  )

  try {
    const stream = provider.createStream(
      { apiKey, model: resolvedModel },
      {
        systemPrompt: [{ text: systemPrompt }],
        messages: [{ role: 'user', content: userMessage }],
        tools: [],
        maxTokens: 16384,
        signal: abortController.signal,
      },
    )

    const emitParserEvents = (parserEvents: ParserEvent[]) => {
      for (const pe of parserEvents) {
        const field = fields[pe.index]
        if (!field) continue

        switch (pe.type) {
          case 'field_start':
            writeSSE(res, 'field_start', {
              uuid: field.uuid,
              fieldName: field.fieldName,
              mode: pe.mode,
            })
            break
          case 'full_delta':
            writeSSE(res, 'field_delta', {
              uuid: field.uuid,
              fieldName: field.fieldName,
              value: pe.value,
            })
            break
          case 'replace_delta':
            writeSSE(res, 'replace_delta', {
              uuid: field.uuid,
              fieldName: field.fieldName,
              search: pe.search,
              value: pe.value,
            })
            break
          case 'operation_end':
            writeSSE(res, 'operation_end', {
              uuid: field.uuid,
              fieldName: field.fieldName,
              search: pe.search,
              replace: pe.replace,
            })
            break
          case 'field_end':
            writeSSE(res, 'field_end', {
              uuid: field.uuid,
              fieldName: field.fieldName,
            })
            break
        }
      }
    }

    let usage: UsageTurn | undefined

    for await (const streamEvent of stream) {
      if (abortController.signal.aborted) break

      if (streamEvent.type === 'text_delta') {
        emitParserEvents(parser.feed(streamEvent.text))
      }

      if (streamEvent.type === 'message_end') {
        usage = createUsageTurn(streamEvent, getDefaultModel(models)) ?? usage
      }

      if (streamEvent.type === 'error') {
        writeSSE(res, 'error', {
          message: streamEvent.error.message,
        })
        break
      }
    }

    // Flush the last field and emit its events.
    emitParserEvents(parser.flush())

    // Send done event with usage.
    writeSSE(res, 'done', { usage })
  } catch (error) {
    if (!abortController.signal.aborted) {
      writeSSE(res, 'error', {
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  res.end()
})
