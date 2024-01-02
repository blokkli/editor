import type { AssistantResultMarkup } from '#blokkli/types'
import OpenAI from 'openai'

const config = useRuntimeConfig()

const INSTRUCTIONS = `
You are generating content for a page builder.
The page builder works using blocks.
Every block has a type and n fields.
The page builder expects the following format for creating a block:

{ "bundle": "BLOCK_TYPE", "fields": { "FIELD_NAME": "FIELD_VALUE" } }

It expects an array of such objects.

Here are the available block types as TypeScript types:

// A section title rendered as a <h2> tag with an optional lead text used for introduction or short summaries
type Title {
  bundle: 'title'
	fields: {
	  title: string // Only plain text
	  lead?: string // Only plain text
	}
}

// A block of prose text markup that is styled and rendered as either a div or section
type Text {
  bundle: 'text'
	fields: {
	  text: string // HTML markup, allowed tags: h2, h3, h4, p, ol, ul, li, a, blockquote
	}
}

// Renders a link that looks like a button, used for CTA.
type Button {
  bundle: 'button'
	fields: {
	  title: string // Only plain text
	  url: string // Only plain text, must be a valid URL.
	}
}

The user will ask you to generate content for the page builder.
You should follow the user's instructions closely and write the content.
You are allowed to write as much content as you want, unless instructed otherwise by the user.
Use the available blocks as you think makes most sense. Use as many blocks as you want.
Only return the blocks as valid JSON without any explanation.
Generate valid JSON without formatting.
The result must be an array of block objects. Here is an example:

[
  { "bundle": "title", "fields": { "title": "A title" } },
  { "bundle": "text", "fields": { "text": "<p>This is some example text.</p>" } },
  { "bundle": "button", "fields": { "title": "Learn more", "url": "https://www.example.com" } }
]

Thank you very much.
`

const INSTRUCTIONS_MARKUP = `
You are generating content for a page builder. You have to generate valid HTML.
The user will ask you to generate content for the page builder.
You should follow the user's instructions closely and write the content.
You are allowed to write as much content as you want, unless instructed otherwise by the user.
You must generate valid HTML. Don't use any markdown annotations. Just return the HTML markup.

The following HTML tags are allowed:
p, h2, h3, h4, ul, li, ol, strong, a, em

Thank you very much.
`

const openai = new OpenAI({
  apiKey: config.openaiKey,
})

const markupCompletion = async (
  prompt: string,
): Promise<AssistantResultMarkup | undefined> => {
  try {
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: INSTRUCTIONS_MARKUP,
        },
        { role: 'user', content: prompt },
      ],
      model: 'gpt-3.5-turbo-1106',
    })
    const content = completion.choices[0].message.content || ''
    return {
      type: 'markup',
      content,
    } as AssistantResultMarkup
  } catch (e) {
    console.log(e)
  }
}

export default defineEventHandler<Promise<AssistantResultMarkup>>(
  async (event) => {
    const body = await readBody(event)
    if (!body || !body.prompt) {
      throw createError('Missing prompt.')
    }

    const result = await markupCompletion(body.prompt)

    if (!result) {
      throw createError('Failed to retrieve data from OpenAI.')
    }

    return result
  },
)
