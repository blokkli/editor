import { defineEditorComponent } from '#blokkli/editor/composables'
import { h } from 'vue'
import InfoBox from './index.vue'

export default defineEditorComponent({
  id: 'info-box',
  label: 'InfoBox',
  category: 'Feedback',
  component: InfoBox,
  backgroundClass: '_bk_bg-white',
  description:
    'Inline notice block with a leading icon and a content area. Pass plain text via the `text` prop (rendered with `v-html`, so simple inline markup works) or use the default slot for richer content. The `color` prop accepts any blökkli theme color (`accent`, `mono`, `teal`, `yellow`, `red`, `lime`, `orange`) and resolves to the matching `bk-scheme-*` class.',
  variants: [
    {
      label: 'Yellow (default)',
      description: 'Default `color="yellow"` and the default info icon.',
      props: {
        text: 'Heads up — unsaved changes will be lost when you leave this page.',
      },
    },
    {
      label: 'Accent',
      props: {
        color: 'accent',
        text: 'Drafts are auto-saved every 30 seconds while you edit.',
      },
    },
    {
      label: 'Mono',
      props: {
        color: 'mono',
        icon: 'bk_mdi_info-fill',
        text: 'This page is read-only — switch to edit mode to make changes.',
      },
    },
    {
      label: 'Teal',
      props: {
        color: 'teal',
        icon: 'bk_mdi_edit',
        text: 'Click any text to edit it inline. Press Escape to cancel.',
      },
    },
    {
      label: 'Red',
      props: {
        color: 'red',
        icon: 'bk_mdi_error-fill',
        text: 'Failed to load this block. The reference may have been deleted.',
      },
    },
    {
      label: 'Lime',
      props: {
        color: 'lime',
        icon: 'bk_mdi_check_circle-fill',
        text: 'All changes saved. Safe to close the editor.',
      },
    },
    {
      label: 'Orange',
      props: {
        color: 'orange',
        icon: 'bk_mdi_warning',
        text: 'This block uses an experimental feature — behaviour may change.',
      },
    },
    {
      label: 'Inline markup via text',
      description:
        'The `text` prop is rendered with `v-html`, so inline tags like `<strong>` or `<code>` work.',
      props: {
        text: 'Run <code>npm run material-icons</code> after referencing a new <strong>bk_mdi_*</strong> icon.',
      },
    },
    {
      label: 'Default slot',
      description:
        'Use the default slot for richer content — multiple paragraphs, lists, links, etc.',
      props: {
        color: 'accent',
        icon: 'bk_mdi_lightbulb',
      },
      slots: {
        default: () => [
          h(
            'p',
            { class: 'font-semibold' },
            'Tip: select multiple blocks at once.',
          ),
          h(
            'p',
            { class: 'mt-5' },
            'Hold Shift while clicking to extend the current selection, or drag a marquee across the canvas.',
          ),
        ],
      },
    },
  ],
})
