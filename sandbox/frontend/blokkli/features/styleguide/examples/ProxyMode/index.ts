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
    "A field in proxy mode shows one block at a time, like a slider or a story. The editor picks which one: a dark band above the field shows its blocks as light pages, each with its index, and clicking a page shows the block and selects it. On the left, the label of the field and which block it shows. A page renders the thumbnail of the block's type, a `thumbnail.vue` next to its component that would replace `proxy.vue`: rendered at 1200 × 800 and scaled down to the page. Without one, the page shows the type. A page is 120 × 80, which is 3:2 like the pictures in the help of the add list. When the pages don't fit, they get smaller, down to 72 × 48, and from there they scroll sideways. The band is editor-only and sits in the page flow, so it never covers the content. Below it, a mock of what the site renders.",
  variants: [
    {
      label: 'Thumbnails',
      description:
        'Every type has a thumbnail, here what the site renders. The selected page gets a white outline, the shown one an accent index. Click the text above or below to clear the selection, or the slide to select it. Six pages are a bit too wide for this container, so they are smaller.',
      render: () =>
        h(Demo, { label: 'Slides', slides: story, initial: 1, selected: true }),
    },
    {
      label: 'Without thumbnails',
      description: 'The fallback: the page shows the type of the block.',
      render: () =>
        h(Demo, {
          label: 'Slides',
          slides: story,
          initial: 1,
          selected: true,
          thumbnails: 'none',
        }),
    },
    {
      label: 'Some thumbnails',
      description: 'Teasers have a thumbnail, titles fall back to their type.',
      render: () =>
        h(Demo, {
          label: 'Slides',
          slides: story,
          initial: 1,
          selected: true,
          thumbnails: 'some',
        }),
    },
    {
      label: 'Long field label',
      description:
        'The label takes at most 100px and is cut off after that. Hover it to read all of it.',
      render: () =>
        h(Demo, { label: 'Scrollytelling slides', slides: story, initial: 1 }),
    },
    {
      label: 'Gallery: images only',
      render: () =>
        h(Demo, { label: 'Images', slides: gallery, addLabel: 'Add an image' }),
    },
    {
      label: 'Many slides',
      description:
        "The pages get smaller when they don't fit, down to 72 × 48. From there, they scroll sideways.",
      render: () =>
        h(Demo, {
          label: 'Slides',
          slides: many,
          initial: 8,
          thumbnails: 'some',
        }),
    },
    {
      label: 'Narrow container',
      description:
        'A slider in a column or a sidebar, 340px wide. Drag its bottom right corner to resize it: the pages grow back to their full size, or shrink until they scroll.',
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
        "Only the label, without a count, and the add button. Below, the editor's room for an empty field.",
      render: () => h(Demo, { label: 'Slides', slides: [] }),
    },
  ],
})
