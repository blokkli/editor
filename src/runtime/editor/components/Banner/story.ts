import { defineEditorComponent } from '#blokkli/editor/composables'
import { h } from 'vue'
import Banner from './index.vue'
import BannerInner from './Inner.vue'

const noop = () => {}

export default defineEditorComponent({
  id: 'banner',
  label: 'Banner',
  category: 'Feedback',
  component: Banner,
  backgroundClass: '_bk_bg-white',
  description:
    'Full-width sticky banner that lives at the bottom of the editor canvas. Each banner registers itself with the UI provider so the editor reserves layout space for it; pass `standalone` to skip that registration (used here in the styleguide). The `scheme` prop accepts any blökkli theme color (`accent`, `mono`, `teal`, `yellow`, `red`, `lime`, `orange`). The default slot is typically a `<BannerInner>` carrying an icon, text, and an optional dismiss button — but you can render anything.',
  variants: [
    {
      label: 'Accent (default)',
      props: { id: 'banner-accent', standalone: true },
      slots: {
        default: () =>
          h(BannerInner, {
            icon: 'bk_mdi_info-fill',
            text: 'You are editing a draft. Changes are saved automatically.',
          }),
      },
    },
    {
      label: 'Yellow',
      description: 'Used by the view-only / translate banners.',
      props: { id: 'banner-yellow', scheme: 'yellow', standalone: true },
      slots: {
        default: () =>
          h(BannerInner, {
            icon: 'bk_mdi_visibility',
            text: 'View-only mode. Switch to edit mode to make changes.',
          }),
      },
    },
    {
      label: 'Red',
      description: 'Used for hard failures (e.g. state unavailable).',
      props: { id: 'banner-red', scheme: 'red', standalone: true },
      slots: {
        default: () =>
          h(BannerInner, {
            icon: 'bk_mdi_sentiment_dissatisfied',
            text: 'Unable to load editor state. Please reload the page.',
          }),
      },
    },
    {
      label: 'Mono',
      props: { id: 'banner-mono', scheme: 'mono', standalone: true },
      slots: {
        default: () =>
          h(BannerInner, {
            icon: 'bk_mdi_history',
            text: 'You are viewing a previous revision of this page.',
          }),
      },
    },
    {
      label: 'Teal',
      props: { id: 'banner-teal', scheme: 'teal', standalone: true },
      slots: {
        default: () =>
          h(BannerInner, {
            icon: 'bk_mdi_edit',
            text: 'Inline editing is active. Click any text to edit it.',
          }),
      },
    },
    {
      label: 'Lime',
      props: { id: 'banner-lime', scheme: 'lime', standalone: true },
      slots: {
        default: () =>
          h(BannerInner, {
            icon: 'bk_mdi_check_circle-fill',
            text: 'All changes saved. Safe to close the editor.',
          }),
      },
    },
    {
      label: 'Orange',
      props: { id: 'banner-orange', scheme: 'orange', standalone: true },
      slots: {
        default: () =>
          h(BannerInner, {
            icon: 'bk_mdi_warning',
            text: 'You are editing on a slow connection. Saves may be delayed.',
          }),
      },
    },
    {
      label: 'With dismiss button',
      description:
        'Pass `button` to render a dismiss action; the banner emits `click` which the consumer typically wires up to remove the banner.',
      props: { id: 'banner-button', scheme: 'yellow', standalone: true },
      slots: {
        default: () =>
          h(BannerInner, {
            icon: 'bk_mdi_translate',
            text: 'You are translating from English. Untranslated fields are highlighted.',
            button: 'Stop translating',
            onClick: noop,
          }),
      },
    },
    {
      label: 'Custom content (default slot)',
      description:
        'The banner renders any default-slot content; here a single inline element with markup. Use this when `BannerInner` is too opinionated.',
      props: { id: 'banner-custom', scheme: 'accent', standalone: true },
      slots: {
        default: () =>
          h('div', { class: 'p-10 flex items-center justify-between gap-10' }, [
            h('span', [
              'Saved as ',
              h('strong', 'Draft v3'),
              ' · 2 minutes ago',
            ]),
            h('span', { class: 'text-xs opacity-80' }, 'autosave'),
          ]),
      },
    },
  ],
})
