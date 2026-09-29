<template>
  <a v-if="display === 'card'" :href class="group flex flex-col gap-3 text-ink">
    <MediaImage
      v-if="hero"
      v-bind="hero"
      hide-credit
      class="overflow-hidden bg-surface"
      img-class="aspect-3/2 w-full object-cover"
    />
    <p v-if="meta" class="pt-1 text-small text-muted">{{ meta }}</p>
    <h3
      class="font-serif text-h3 font-semibold group-hover:text-primary group-hover:underline"
    >
      {{ label }}
    </h3>
    <p v-if="teaserLead">{{ teaserLead }}</p>
  </a>
  <a
    v-else
    :href
    class="group flex items-center gap-4 border-b border-line py-4 text-ink"
  >
    <span
      v-if="date"
      class="flex size-15 shrink-0 flex-col items-center justify-center bg-primary-light text-primary-dark"
      aria-hidden="true"
    >
      <strong class="text-h3">{{ date.badgeDay }}</strong>
      <span class="text-label uppercase">{{ date.badgeMonth }}</span>
    </span>
    <MediaImage
      v-else-if="hero"
      v-bind="hero"
      hide-credit
      class="w-24 shrink-0 overflow-hidden bg-surface"
      img-class="aspect-3/2 w-full object-cover"
    />
    <div class="flex grow flex-col">
      <h3 class="font-semibold group-hover:text-primary group-hover:underline">
        {{ label }}
      </h3>
      <p v-if="meta" class="text-small text-muted">{{ meta }}</p>
    </div>
    <SpriteSymbol name="arrow-right" class="size-5 shrink-0 text-primary" />
  </a>
</template>

<script lang="ts" setup>
import { computed, useEasyTexts } from '#imports'
import { SpriteSymbol } from '#components'
import type {
  MediaImageFragment,
  NodeTeaserFragment,
} from '#graphql-operations'
import MediaImage from '~/components/Media/Image/index.vue'
import { formatDateRange } from '~/helpers/date'

// A page, news item or event as a card or a list item: the teaser block and
// the fragments that list news and events. In a list, an event gets a date
// badge and the others their image. The teaser block can override the node's
// title, lead and image, or link to a URL without a node.
const props = defineProps<{
  node?: NodeTeaserFragment | null
  title?: string | null
  lead?: string | null
  image?: MediaImageFragment | null
  url?: string | null
  display: 'card' | 'list'
}>()

const { $texts } = useEasyTexts()

const href = computed(() => props.url ?? props.node?.url?.path ?? undefined)
const label = computed(() => props.title || props.node?.label || href.value)
const hero = computed(
  () =>
    props.image ??
    (props.node && 'hero' in props.node ? props.node.hero : null),
)
const teaserLead = computed(
  () =>
    props.lead || (props.node && 'lead' in props.node ? props.node.lead : null),
)
const date = computed(() =>
  props.node?.__typename === 'NodeEvent' ? props.node.date : null,
)

const meta = computed(() => {
  const node = props.node
  if (!node) {
    return ''
  }
  if (node.__typename === 'NodeNews' && node.createdDate?.first?.day) {
    return $texts('news.meta', 'News, @date', {
      '@date': node.createdDate.first.day,
    })
  }
  if (node.__typename === 'NodeEvent' && node.date) {
    return formatDateRange(node.date)
  }
  return ''
})
</script>
