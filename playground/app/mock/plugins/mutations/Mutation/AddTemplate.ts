import { BlockProxy, type MutationContext } from '#mock/state/EditState'
import { Mutation } from '../Mutation'
import { entityStorageManager } from '#mock/entityStorage'
import type { Paragraph } from '~/mock/state/Paragraph/Paragraph'
import type { FieldBlocks } from '#mock/state/Field/Blocks'

export type MutationAddTemplateArgs = {
  templateUuid: string
  hostEntityType: string
  hostEntityUuid: string
  hostField: string
  preceedingUuid: string | null
}

export class MutationAddTemplate extends Mutation {
  private uuidCounter = 0

  constructor(configuration?: Record<string, any>) {
    super('add_template', configuration)
  }

  override execute(context: MutationContext, args: MutationAddTemplateArgs) {
    const template = entityStorageManager.storages.template_item.load(
      args.templateUuid,
    )

    if (!template) {
      throw new Error(`Template not found: ${args.templateUuid}`)
    }

    const templateBlocks = template.getBlocks().getBlocks()

    // Clone blocks in reverse order so they end up in correct order
    // (each is inserted at the same position)
    const reversedBlocks = [...templateBlocks].reverse()

    for (const block of reversedBlocks) {
      this.cloneBlockRecursively(
        context,
        block,
        args.hostEntityType,
        args.hostEntityUuid,
        args.hostField,
        args.preceedingUuid,
      )
    }
  }

  /**
   * Recursively clones a block and all its nested blocks.
   * Returns the new UUID of the cloned block.
   */
  private cloneBlockRecursively(
    context: MutationContext,
    block: Paragraph,
    hostEntityType: string,
    hostEntityUuid: string,
    hostField: string,
    preceedingUuid: string | null,
  ): string {
    // Generate a new UUID for this block
    const newUuid = this.getUuidForNewEntity(`block_${this.uuidCounter++}`)

    // First, recursively clone all nested blocks and collect the UUID mappings
    const nestedUuidMap = new Map<string, string>()

    const blockFields = block.getBlockFields()
    for (const field of blockFields) {
      const nestedBlocks = field.getBlocks()
      // Reverse nested blocks so they end up in correct order
      // (each is inserted at the same position)
      const reversedNestedBlocks = [...nestedBlocks].reverse()
      for (const nestedBlock of reversedNestedBlocks) {
        // Clone nested block with the NEW parent block UUID as host
        const newNestedUuid = this.cloneBlockRecursively(
          context,
          nestedBlock,
          'paragraph',
          newUuid,
          field.id,
          null,
        )
        nestedUuidMap.set(nestedBlock.uuid, newNestedUuid)
      }
    }

    // Now clone this block
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

    // Create proxy for the cloned block
    const proxy = new BlockProxy(
      clonedBlock,
      hostEntityType,
      hostEntityUuid,
      hostField,
    )

    context.addProxy(proxy, preceedingUuid)

    return newUuid
  }
}
