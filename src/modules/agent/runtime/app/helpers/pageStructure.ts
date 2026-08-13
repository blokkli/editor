import type { BlokkliApp } from '#blokkli/editor/types/app'
import type {
  PageStructure,
  PageStructureBlock,
} from '#blokkli/agent/shared/types'
import {
  getParagraphChildren,
  readAgentFieldValue,
  readBlockContentFields,
} from '#blokkli/agent/app/tools/helpers'
import { itemEntityType } from '#blokkli-build/config'

const MAX_CONTENT_LENGTH = 150

function truncate(text: string): string {
  const cleaned = text.trim()
  if (cleaned.length <= MAX_CONTENT_LENGTH) return cleaned
  return cleaned.slice(0, MAX_CONTENT_LENGTH) + ' [TRUNCATED]'
}

export function buildBlock(
  app: BlokkliApp,
  uuid: string,
  bundle: string,
): PageStructureBlock {
  const block: PageStructureBlock = { uuid, bundle }

  // Collect content fields (plain + markup only).
  const content: Record<string, string> = {}

  for (const f of readBlockContentFields(app, uuid, itemEntityType, bundle)) {
    const truncated = truncate(f.value)
    if (truncated) {
      content[f.fieldName] = truncated
    }
  }

  if (Object.keys(content).length > 0) {
    block.contentFields = content
  }

  // Collect nested block fields.
  const children = getParagraphChildren(app, uuid)
  if (children.length > 0) {
    const fields: Record<string, PageStructureBlock[]> = {}
    for (const child of children) {
      fields[child.fieldName] = child.paragraphs.map((b) =>
        buildBlock(app, b.uuid, b.bundle),
      )
    }
    block.fields = fields
  }

  return block
}

export function buildPageStructure(app: BlokkliApp): PageStructure {
  const pageUuid = app.context.value.entityUuid
  const entityType = app.context.value.entityType
  const entityBundle = app.context.value.entityBundle

  // Build top-level fields → blocks tree.
  const topLevelChildren = getParagraphChildren(app, pageUuid)
  const fields: Record<string, PageStructureBlock[]> = {}
  let totalParagraphs = 0

  for (const child of topLevelChildren) {
    fields[child.fieldName] = child.paragraphs.map((b) => {
      const block = buildBlock(app, b.uuid, b.bundle)
      totalParagraphs += countBlocks(block)
      return block
    })
  }

  // Collect entity-level content fields (page entity itself).
  const entityEditableConfigs = app.types.editableFieldConfig
    .forEntityTypeAndBundle(entityType, entityBundle)
    .filter((f) => f.type !== 'table')

  let entityContentFields: Record<string, string> | undefined

  for (const config of entityEditableConfigs) {
    const read = readAgentFieldValue(
      app,
      entityType,
      pageUuid,
      entityBundle,
      config.name,
    )
    if (!read) continue
    const truncated = truncate(read.value)
    if (truncated) {
      if (!entityContentFields) entityContentFields = {}
      entityContentFields[config.name] = truncated
    }
  }

  return {
    totalParagraphs,
    fields,
    entityContentFields,
  }
}

export function countBlocks(block: PageStructureBlock): number {
  let count = 1
  if (block.fields) {
    for (const blocks of Object.values(block.fields)) {
      for (const child of blocks) {
        count += countBlocks(child)
      }
    }
  }
  return count
}
