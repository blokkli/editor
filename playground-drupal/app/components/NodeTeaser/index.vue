<template>
  <a
    :href="node.url?.path"
    class="group"
    :class="display === 'list' ? 'flex gap-4 py-4' : 'flex flex-col gap-3'"
  >
    <div
      v-if="'hero' in node && node.hero"
      class="shrink-0 overflow-hidden bg-stone-200"
      :class="display === 'list' ? 'w-32' : ''"
    >
      <MediaImage
        v-bind="node.hero"
        hide-credit
        img-class="aspect-[3/2] w-full object-cover"
      />
    </div>
    <div class="flex flex-col gap-1">
      <p v-if="meta" class="text-sm font-semibold text-stone-600">
        {{ meta }}
      </p>
      <h3 class="text-xl font-bold group-hover:underline">
        {{ node.label }}
      </h3>
      <p
        v-if="'lead' in node && node.lead"
        class="text-stone-600"
        :class="{ 'line-clamp-2': display === 'list' }"
      >
        {{ node.lead }}
      </p>
    </div>
  </a>
</template>

<script lang="ts" setup>
import { computed, useEasyTexts } from '#imports'
import type { NodeTeaserFragment } from '#graphql-operations'
import MediaImage from '~/components/Media/Image/index.vue'
import { formatDateRange } from '~/helpers/date'

// A page, news item or event as a card or a list item: the teaser block and
// the fragments that list news and events.
const props = defineProps<{
  node: NodeTeaserFragment
  display: 'card' | 'list'
}>()

const { $texts } = useEasyTexts()

const meta = computed(() => {
  const node = props.node
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
