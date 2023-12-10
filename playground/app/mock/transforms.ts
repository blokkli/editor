import type { BlokkliTransformPlugin } from '#blokkli/types'

export const transforms: BlokkliTransformPlugin[] = [
  {
    id: 'merge_texts',
    label: 'Merge texts',
    bundles: ['text'],
    targetBundles: ['text'],
    min: 2,
    max: -1,
  },
]

export function applyTransformPlugin(pluginId: string, uuids: string[]) {}
