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
  {
    id: 'button_to_text',
    label: 'Button to Text',
    bundles: ['button'],
    targetBundles: ['text'],
    min: 1,
    max: -1,
  },
  {
    id: 'extract_text_to_blocks',
    label: 'Extract text to blocks',
    bundles: ['text'],
    targetBundles: ['text', 'button'],
    min: 1,
    max: 1,
  },
]

export function applyTransformPlugin(pluginId: string, uuids: string[]) {}
