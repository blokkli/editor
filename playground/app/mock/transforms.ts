import type { TransformPlugin } from '#blokkli/types'

export const transforms: TransformPlugin[] = [
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
  {
    id: 'search_replace',
    label: 'Search and Replace',
    bundles: ['text', 'card', 'title'],
    min: 1,
    max: -1,
    configInputs: [
      {
      type: 'text',
      name: 'search',
      label: 'Search',
      required: true
        },
{
      type: 'text',
      name: 'replace',
      label: 'Replace',
      required: true
        },

    ]
  },
]

export function applyTransformPlugin(pluginId: string, uuids: string[]) {}
