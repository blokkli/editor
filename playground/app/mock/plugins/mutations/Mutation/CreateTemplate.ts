import type { MutationContext } from '#mock/state/EditState'
import { Mutation } from '../Mutation'
import { entityStorageManager } from '#mock/entityStorage'
import { TemplateItem } from '#mock/state/TemplateItem'
import type { Paragraph } from '~/mock/state/Paragraph/Paragraph'
import type { FieldBlocks } from '#mock/state/Field/Blocks'

export type MutationCreateTemplateArgs = {
  label: string
  description?: string
  uuids: string[]
  isDefault?: boolean
}

export class MutationCreateTemplate extends Mutation {
  private uuidCounter = 0

  constructor(configuration?: Record<string, any>) {
    super('create_template', configuration)
  }

  override execute(context: MutationContext, args: MutationCreateTemplateArgs) {
    let templateItemId = this.configuration['templateItemId']

    // Create template item if it doesn't already exist.
    if (!templateItemId) {
      templateItemId = this.getUuidForNewEntity('template_item')
      this.configuration['templateItemId'] = templateItemId
    }

    let templateItem =
      entityStorageManager.storages.template_item.load(templateItemId)

    if (!templateItem) {
      templateItem = new TemplateItem(templateItemId)
      templateItem.setValues({
        title: args.label,
        description: args.description || '',
        isDefault: args.isDefault || false,
      })
      entityStorageManager.storages.template_item.add(templateItem)
    }

    // Clone the blocks and add them to the template
    const clonedUuids: string[] = []

    for (const uuid of args.uuids) {
      const proxy = context.getProxy(uuid)
      if (!proxy) {
        continue
      }

      // Clone the block recursively
      const clonedUuid = this.cloneBlockRecursively(proxy.block)
      clonedUuids.push(clonedUuid)
    }

    // Set the cloned blocks on the template
    templateItem.getBlocks().setList(clonedUuids)
  }

  /**
   * Recursively clones a block and all its nested blocks.
   * Returns the new UUID of the cloned block.
   */
  private cloneBlockRecursively(block: Paragraph): string {
    // Generate a new UUID for this block
    const newUuid = this.getUuidForNewEntity(
      `template_block_${this.uuidCounter++}`,
    )

    // First, recursively clone all nested blocks and collect the UUID mappings
    const nestedUuidMap = new Map<string, string>()

    const blockFields = block.getBlockFields()
    for (const field of blockFields) {
      const nestedBlocks = field.getBlocks()
      for (const nestedBlock of nestedBlocks) {
        const newNestedUuid = this.cloneBlockRecursively(nestedBlock)
        nestedUuidMap.set(nestedBlock.uuid, newNestedUuid)
      }
    }

    // Clone this block
    const clonedBlock = entityStorageManager.cloneBlock(
      block,
      newUuid,
    ) as Paragraph

    // Update the cloned block's field values to reference the new nested UUIDs
    for (const field of blockFields) {
      const clonedField = clonedBlock.get<FieldBlocks>(field.id)
      if (clonedField && clonedField.list) {
        const updatedList = clonedField.list.map((item) => ({
          uuid: nestedUuidMap.get(item.uuid) || item.uuid,
        }))
        clonedField.setList(updatedList)
      }
    }

    return newUuid
  }
}
