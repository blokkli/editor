<template>
  <div v-blokkli-droppable:field_media>
    <img
      v-if="src"
      :src
      :srcset
      :sizes="placement?.sizes"
      :width="sources?.image?.content?.width ?? undefined"
      :height="sources?.image?.content?.height ?? undefined"
      :alt="media?.image?.alt ?? ''"
      :loading="placement?.priority ? 'eager' : 'lazy'"
      :fetchpriority="placement?.priority ? 'high' : undefined"
      class="block w-full"
      :class="placement?.cover ? 'h-full object-cover' : 'h-auto'"
      :style="objectPosition"
    />
  </div>
</template>

<script lang="ts" setup>
import type { ParagraphImageFragment } from '#graphql-operations'
import { useCompositionChild } from '#blokkli/composition/child'

// An image in a composition. The root is its box: the composition puts its
// class and its ratio on it, and the image fills it. The composition says how
// wide it's shown (`sizes`); the srcset offers the site's image styles, and
// the browser picks the smallest that's enough.
const props = defineProps<ParagraphImageFragment>()

defineBlokkli({
  bundle: 'image',
  renderFor: [{ parentBundle: 'composition' }],
  hydrate: 'never',
  editor: {
    icon: 'bk_mdi_image',
    editTitle: (el) => el.querySelector('img')?.alt,
  },
})

const child = useCompositionChild()
const placement = computed(() => child.value?.placement ?? null)

const derivatives = computed(() =>
  [
    props.sources?.image?.medium,
    props.sources?.image?.large,
    props.sources?.image?.content,
  ].filter(
    (d): d is { urlPath: string; width: number; height: number } =>
      !!d?.urlPath && !!d.width,
  ),
)

const src = computed(() => derivatives.value.at(-1)?.urlPath)

const srcset = computed(() => {
  const seen = new Set<number>()
  return derivatives.value
    .filter((d) => !seen.has(d.width) && seen.add(d.width))
    .map((d) => `${d.urlPath} ${d.width}w`)
    .join(', ')
})

// A cropped image keeps its focal point in view.
const objectPosition = computed(() => {
  const point = props.media?.image?.focalPoint
  return placement.value?.cover && point
    ? { objectPosition: `${point.x}% ${point.y}%` }
    : undefined
})
</script>
