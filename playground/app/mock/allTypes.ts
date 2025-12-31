import type { BlockBundleDefinition } from '#blokkli/editor/types/definitions'
import { getBlockBundles } from './state/Block'

export const allTypes: BlockBundleDefinition[] = getBlockBundles().map(
  (block) => {
    return {
      id: block.bundle,
      label: block.label,
      allowReusable: block.allowReusable,
      isTranslatable: block.isTranslatable,
      hasPublishOn: block.bundle !== 'title',
      hasUnpublishOn: block.bundle !== 'image',
    }
  },
)
