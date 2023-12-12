import type { BlokkliAvailableType } from '#blokkli/types'
import { getBlockBundles } from './state/Block'
import { getContentBundles } from './state/Entity/Content'
import { FieldBlocks } from './state/Field/Blocks'

export const availableTypes: BlokkliAvailableType[] = [
  ...getContentBundles(),
  ...getBlockBundles(),
]
  .map((item) => {
    const blockFields = item
      .getFieldDefintions()
      .filter((field) => field instanceof FieldBlocks) as FieldBlocks[]

    return blockFields.map((field) => {
      return {
        entityType: item.entityType,
        bundle: item.bundle,
        fieldName: field.id,
        allowedTypes: field.allowedBundles,
      }
    })
  })
  .flat()
