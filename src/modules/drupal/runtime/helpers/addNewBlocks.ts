import type { AddNewBlocksEventBlock } from '#blokkli/editor/events'
import type { ParagraphsBlokkliAddMultipleItemInput } from '#graphql-operations'

type DroppableField = {
  type: string
  name: string
  entityType: string
  entityBundle: string
}

/**
 * Maps a new block and its children to the input of `pbAddMultipleParagraphs`.
 * The value of a droppable field is a reference or a link, by the field's type;
 * any other value is a text. The config also lists the host's fields, and the
 * host's bundle can have the name of a paragraph type: only a paragraph type's
 * field counts.
 */
export function mapBlockToGraphQL(
  block: AddNewBlocksEventBlock,
  droppableFieldConfig: DroppableField[],
): ParagraphsBlokkliAddMultipleItemInput {
  const values: Record<string, unknown> = {}
  for (const entry of block.values ?? []) {
    const droppableConfig = droppableFieldConfig.find(
      (f) =>
        f.entityType === 'paragraph' &&
        f.entityBundle === block.bundle &&
        f.name === entry.fieldName,
    )
    if (droppableConfig) {
      if (droppableConfig.type === 'reference') {
        if (typeof entry.fieldValue !== 'string') {
          values[entry.fieldName] = {
            target_id: entry.fieldValue.entityId,
          }
        }
      } else if (droppableConfig.type === 'link') {
        if (typeof entry.fieldValue === 'string') {
          values[entry.fieldName] = entry.fieldValue
        } else {
          values[entry.fieldName] =
            `entity:${entry.fieldValue.entityType}/${entry.fieldValue.entityId}`
        }
      }
    } else if (typeof entry.fieldValue === 'string') {
      values[entry.fieldName] = entry.fieldValue
    }
  }

  return {
    bundle: block.bundle,
    uuid: block.blockUuid,
    values,
    options: block.options,
    children: block.children
      ? Object.entries(block.children).map(([fieldName, childBlocks]) => ({
          fieldName,
          items: childBlocks.map((child) =>
            mapBlockToGraphQL(child, droppableFieldConfig),
          ),
        }))
      : undefined,
  }
}
