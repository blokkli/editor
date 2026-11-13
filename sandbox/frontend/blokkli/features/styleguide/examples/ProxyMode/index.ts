import { h } from '#imports'
import { defineEditorSnippet } from '#blokkli/editor/composables'
import Demo from './Demo/index.vue'
import type { DemoSlide } from './types'

const story: DemoSlide[] = [
  {
    uuid: 'story-1',
    bundle: 'title',
    title: 'A day at the lake',
    text: 'Story',
  },
  {
    uuid: 'story-2',
    bundle: 'teaser',
    title: '7:00 The pool opens',
    text: 'Early swimmers have the lanes to themselves until nine.',
  },
  {
    uuid: 'story-3',
    bundle: 'teaser',
    title: '10:00 Swimming lessons',
    text: 'Children from five years learn to swim in the shallow pool.',
  },
  {
    uuid: 'story-4',
    bundle: 'teaser',
    title: '13:00 Lunch at the kiosk',
    text: 'Salads, grilled fish and ice cream, served on the terrace.',
  },
  { uuid: 'story-5', bundle: 'title', title: 'Evening', text: 'Chapter 2' },
  {
    uuid: 'story-6',
    bundle: 'teaser',
    title: '19:00 Sunset concert',
    text: 'Every Friday in July, local bands play on the jetty.',
  },
]

const gallery: DemoSlide[] = [
  'The diving platform',
  'The lawn by the kiosk',
  'The jetty at dusk',
  "The children's pool",
].map((title, tone) => ({
  uuid: `image-${tone}`,
  bundle: 'image',
  title,
  tone,
}))

const many: DemoSlide[] = Array.from({ length: 14 }, (_, i) =>
  i % 5 === 0
    ? {
        uuid: `many-${i}`,
        bundle: 'title',
        title: `Chapter ${i / 5 + 1}`,
        text: 'Story',
      }
    : {
        uuid: `many-${i}`,
        bundle: 'teaser',
        title: `Step ${i + 1}`,
        text: 'One of many steps of a long story.',
      },
)

export default defineEditorSnippet({
  id: 'example-proxy-mode',
  label: 'Field pager',
  category: 'Proxy mode',
  description:
    "A field in proxy mode shows one block at a time, like a slider or a story. While editing, a dark band above the field shows its blocks as light pages, each with its index and the icon and name of its type, and the block it shows renders below as a real block. In the editor, clicking a page selects its block, which shows it; here, the click stands in for that. On the left, the label of the field and which block it shows. A page is 120 × 80, which is 3:2 like the pictures in the help of the add list. When the pages don't fit, they get smaller, down to 72 × 48; the ones that still don't fit are cut off until there are dots. The band never scrolls and has no add button: the field's end bar and the shown block's tabs add. Below it, a mock of the shown block.",
  variants: [
    {
      label: 'Pages',
      description:
        'The selected page gets a white outline, the shown one an accent index. Click the text above or below to clear the selection, or the slide to select it. Six pages are a bit too wide for this container, so they are smaller.',
      render: () =>
        h(Demo, { label: 'Slides', slides: story, initial: 1, selected: true }),
    },
    {
      label: 'Long field label',
      description: 'The label takes at most 100px and is cut off after that.',
      render: () =>
        h(Demo, { label: 'Scrollytelling slides', slides: story, initial: 1 }),
    },
    {
      label: 'Gallery: images only',
      render: () => h(Demo, { label: 'Images', slides: gallery }),
    },
    {
      label: 'Many slides',
      description:
        "The pages get smaller when they don't fit, down to 72 × 48. The ones that still don't fit are cut off, with no marker. The shown block can be one of them: then no page is marked, and the count says which one it is.",
      render: () => h(Demo, { label: 'Slides', slides: many, initial: 12 }),
    },
    {
      label: 'Narrow container',
      description:
        'A slider in a column or a sidebar, 340px wide. Drag its bottom right corner to resize it: the pages grow back to their full size, or shrink until the last ones are cut off.',
      render: () =>
        h(Demo, {
          label: 'Slides',
          slides: story,
          width: 340,
          resizable: true,
        }),
    },
    {
      label: 'Empty field',
      description:
        'Only the label, without a count. The empty list fills the band, as high as a page: in the editor, the add buttons draw the dashed area there to add the first block.',
      render: () => h(Demo, { label: 'Slides', slides: [] }),
    },
  ],
})
