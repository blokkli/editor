import type {
  BlockBundleDefinition,
  BlockPermission,
} from '#blokkli/editor/types/definitions'
import { getParagraphBundles } from './state/Paragraph'

const RESTRICT_PERMISSIONS = true

export const allTypes: BlockBundleDefinition[] = getParagraphBundles().map(
  (block) => {
    let permissions: BlockPermission[] = ['edit', 'add', 'delete']
    if (RESTRICT_PERMISSIONS && import.meta.dev) {
      if (block.bundle === 'widget' || block.bundle === 'grid') {
        permissions = []
      } else if (block.bundle === 'card') {
        permissions = ['add', 'delete']
      } else if (block.bundle === 'image') {
        permissions = []
      } else if (block.bundle === 'from_library') {
        permissions = []
      } else if (block.bundle === 'blokkli_fragment') {
        permissions = ['add', 'edit']
      }
    }
    return {
      id: block.bundle,
      label: block.label,
      description: block.description,
      allowReusable: block.allowReusable,
      isTranslatable: block.isTranslatable,
      hasPublishOn: block.bundle !== 'title',
      hasUnpublishOn: block.bundle !== 'image',
      imageUrl: block.imageUrl,
      permissions,
    }
  },
)
