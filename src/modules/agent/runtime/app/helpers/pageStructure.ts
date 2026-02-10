import type { BlokkliApp } from '#blokkli/editor/types/app'
import type {
  PageStructure,
  PageStructureBlock,
} from '#blokkli/agent/shared/types'
import {
  getFieldType,
  getEditableValue,
  getBlockChildren,
} from '#blokkli/agent/app/tools/schemas'
import { itemEntityType } from '#blokkli-build/config'

const MAX_CONTENT_LENGTH = 150

function stripHtml(html: string): string {
  // Remove HTML tags to get plain text preview.
  return html.replace(/<[^>]*>/g, '').trim()
}

function truncate(text: string): string {
  const cleaned = text.trim()
  if (cleaned.length <= MAX_CONTENT_LENGTH) return cleaned
  return cleaned.slice(0, MAX_CONTENT_LENGTH) + '…'
}

function buildBlock(app: BlokkliApp, uuid: string, bundle: string): PageStructureBlock {
  const block: PageStructureBlock = { uuid, bundle }

  // Collect content fields (plain + markup only).
  const editables = app.directive.getEditablesForBlock(uuid)
  const content: Record<string, string> = {}

  for (const editable of editables) {
    const fieldType = getFieldType(app, itemEntityType, bundle, editable.fieldName)
    if (!fieldType) continue

    const raw = getEditableValue(app, itemEntityType, uuid, bundle, editable.fieldName, fieldType)
    const text = fieldType === 'markup' ? stripHtml(raw) : raw
    const truncated = truncate(text)
    if (truncated) {
      content[editable.fieldName] = truncated
    }
  }

  if (Object.keys(content).length > 0) {
    block.contentFields = content
  }

  // Collect nested block fields.
  const children = getBlockChildren(app, uuid)
  if (children.length > 0) {
    const fields: Record<string, PageStructureBlock[]> = {}
    for (const child of children) {
      fields[child.fieldName] = child.blocks.map((b) =>
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
  const topLevelChildren = getBlockChildren(app, pageUuid)
  const fields: Record<string, PageStructureBlock[]> = {}
  let totalBlocks = 0

  for (const child of topLevelChildren) {
    fields[child.fieldName] = child.blocks.map((b) => {
      const block = buildBlock(app, b.uuid, b.bundle)
      totalBlocks += countBlocks(block)
      return block
    })
  }

  // Collect entity-level content fields (page entity itself).
  const entityEditableConfigs = app.types.editableFieldConfig
    .forEntityTypeAndBundle(entityType, entityBundle)
    .filter((f) => f.type !== 'table')

  let entityContentFields: Record<string, string> | undefined

  for (const config of entityEditableConfigs) {
    const fieldType =
      config.type === 'frame' || config.type === 'markup' ? 'markup' : 'plain'
    const raw = getEditableValue(
      app,
      entityType,
      pageUuid,
      entityBundle,
      config.name,
      fieldType as 'plain' | 'markup',
    )
    const text = fieldType === 'markup' ? stripHtml(raw) : raw
    const truncated = truncate(text)
    if (truncated) {
      if (!entityContentFields) entityContentFields = {}
      entityContentFields[config.name] = truncated
    }
  }

  return {
    totalBlocks,
    fields,
    entityContentFields,
  }
}

function countBlocks(block: PageStructureBlock): number {
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
