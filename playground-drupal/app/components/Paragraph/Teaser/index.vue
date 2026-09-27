<template>
  <div
    v-blokkli-droppable:field_node
    :class="{ 'container-content': !parentType, hidden: !node && !isEditing }"
  >
    <a
      v-if="node"
      :href="node.url?.path"
      class="group"
      :class="
        options.display === 'list'
          ? 'flex gap-4 border-y border-stone-300 py-4'
          : 'flex flex-col gap-3'
      "
    >
      <div
        v-if="'hero' in node && node.hero"
        class="shrink-0 overflow-hidden bg-stone-200"
        :class="options.display === 'list' ? 'w-32' : ''"
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
          :class="{ 'line-clamp-2': options.display === 'list' }"
        >
          {{ node.lead }}
        </p>
      </div>
    </a>
    <p v-else-if="isEditing" class="rounded-sm bg-stone-200 p-4 text-stone-600">
      The content of this teaser isn't available.
    </p>
  </div>
</template>

<script lang="ts" setup>
import { computed, defineBlokkli } from '#imports'
import type { ParagraphTeaserFragment } from '#graphql-operations'
import MediaImage from '~/components/Media/Image/index.vue'
import { useLanguage } from '~/composables/useLanguage'
import { formatDateRange, formatTimestamp } from '~/helpers/date'

const props = defineProps<ParagraphTeaserFragment>()

const language = useLanguage()

const meta = computed(() => {
  const node = props.node
  if (node?.__typename === 'NodeNews' && node.created) {
    return 'News, ' + formatTimestamp(node.created, language.value)
  }
  if (node?.__typename === 'NodeEvent' && node.date?.start && node.date.end) {
    return formatDateRange(node.date.start, node.date.end, language.value)
  }
  return ''
})

const { options, parentType } = defineBlokkli({
  bundle: 'teaser',
  globalOptions: ['bkVisibleLanguages'],
  options: {
    display: {
      type: 'radios',
      label: 'Display',
      default: 'card',
      options: {
        card: 'Card',
        list: 'List',
      },
    },
  },
  editor: {
    icon: 'bk_mdi_article',
    editTitle: (el) => el.querySelector('h3')?.textContent,
  },
})

const isEditing = import.meta.blokkliEditing
</script>
