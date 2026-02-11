import type { BlockBundleDefinition } from '#blokkli/editor/types/definitions'
import { getParagraphBundles } from './state/Paragraph'

export const allTypes: BlockBundleDefinition[] = getParagraphBundles().map(
  (block) => {
    return {
      id: block.bundle,
      label: block.label,
      description: block.description,
      allowReusable: block.allowReusable,
      isTranslatable: block.isTranslatable,
      hasPublishOn: block.bundle !== 'title',
      hasUnpublishOn: block.bundle !== 'image',
      imageUrl: block.imageUrl,
    }
  },
)
