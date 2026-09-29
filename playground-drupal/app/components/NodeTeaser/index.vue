<template>
  <SiteLink
    v-if="display === 'card'"
    :to="href"
    class="group flex flex-col gap-3 text-ink"
  >
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
  </SiteLink>
  <SiteLink
    v-else-if="display === 'link'"
    :to="href"
    class="group flex flex-col gap-1"
  >
    <span class="flex items-center gap-2 font-semibold text-primary">
      <span class="group-hover:underline">{{ label }}</span>
      <SpriteSymbol name="arrow-right" class="size-5 shrink-0" />
    </span>
    <span v-if="teaserLead" class="line-clamp-2 text-small text-muted">
      {{ teaserLead }}
    </span>
  </SiteLink>
  <SiteLink
    v-else
    :to="href"
    class="group flex items-center gap-4 border-b border-line py-4 text-ink"
  >
    <Tile v-if="date" tone="light">
      <strong class="text-h3">{{ date.badgeDay }}</strong>
      <span class="text-label uppercase">{{ date.badgeMonth }}</span>
    </Tile>
    <Tile v-else-if="node?.__typename === 'NodePublication'" tone="surface">
      <SpriteSymbol name="document" class="size-6" />
    </Tile>
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
  </SiteLink>
</template>

<script lang="ts" setup>
import { computed, useEasyTexts } from '#imports'
import { SiteLink, SpriteSymbol } from '#components'
import type {
  MediaImageFragment,
  NodeTeaserFragment,
} from '#graphql-operations'
import MediaImage from '~/components/Media/Image/index.vue'
import Tile from '~/components/Tile/index.vue'
import { usePublicationType } from '~/composables/usePublicationType'
import { formatDateRange } from '~/helpers/date'

// A page, news item, event or publication as a card, a list item or a link
// with its lead (a related topic): the teaser block and the automatic teaser
// list. In a list, an event gets a date badge, a publication a document icon
// and the others their image. The teaser block can override the node's title,
// lead and image, or link to a URL without a node.
const props = defineProps<{
  node?: NodeTeaserFragment | null
  title?: string | null
  lead?: string | null
  image?: MediaImageFragment | null
  url?: string | null
  display: 'card' | 'list' | 'link'
}>()

const { $texts } = useEasyTexts()
const publicationType = usePublicationType()

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
  if (node.__typename === 'NodePublication') {
    const type = publicationType(node.publicationType)
    return node.period?.endDay
      ? $texts('publication.until', '@type, until @date', {
          '@type': type,
          '@date': node.period.endDay,
        })
      : type
  }
  return ''
})
</script>
