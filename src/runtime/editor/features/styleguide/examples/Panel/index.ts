import { defineEditorSnippet } from '#blokkli/editor/composables'
import Panel from './Panel.vue'

export default defineEditorSnippet({
  id: 'example-panel',
  label: 'Full example',
  category: 'Panels',
  backgroundClass: '_bk_bg-mono-200',
  description:
    'A `PanelSection` with a list of `PanelItem`s, a couple of collapsible `PanelDetails` panels, and a row of `PanelAction`s at the bottom.',
  variants: [
    {
      label: 'Full example',
      component: Panel,
    },
  ],
})
