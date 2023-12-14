import type { BlokkliItemType } from '#blokkli/types'
import { getBlockBundles } from './state/Block'

export const allTypes: BlokkliItemType[] = getBlockBundles().map((block) => {
  return {
    id: block.bundle,
    label: block.label,
    allowReusable: block.allowReusable,
  }
})
