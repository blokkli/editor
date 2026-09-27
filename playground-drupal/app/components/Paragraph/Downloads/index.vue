<template>
  <div
    v-blokkli-droppable:field_documents
    :class="{ 'container-content': !parentType && fieldListType === 'default' }"
  >
    <ul class="divide-y divide-line border-y border-line">
      <li v-for="item in items" :key="item.uuid">
        <a
          :href="item.href"
          class="flex items-baseline justify-between gap-4 py-3 hover:underline"
        >
          <span class="font-semibold">{{ item.name }}</span>
          <span class="shrink-0 text-small text-muted">
            {{ item.meta }}
          </span>
        </a>
      </li>
    </ul>
  </div>
</template>

<script lang="ts" setup>
import { computed, defineBlokkli } from '#imports'
import type { ParagraphDownloadsFragment } from '#graphql-operations'
import { useLanguage } from '~/composables/useLanguage'

const props = defineProps<ParagraphDownloadsFragment>()

const language = useLanguage()

// "240 kB" or "1.2 MB", in the page's language (e.g. "1,2 Mo" in French).
function formatSize(bytes: number): string {
  const megabytes = bytes >= 1024 * 1024
  return new Intl.NumberFormat(language.value, {
    style: 'unit',
    unit: megabytes ? 'megabyte' : 'kilobyte',
    maximumFractionDigits: megabytes ? 1 : 0,
  }).format(megabytes ? bytes / 1024 / 1024 : Math.max(1, bytes / 1024))
}

// The type comes from the file's extension, e.g. "PDF, 240 KB".
const items = computed(() =>
  (props.documents ?? []).flatMap((media) => {
    if (!media) {
      return []
    }
    const href = media.mediaFileUrl?.path ?? undefined
    const extension = href?.split('.').pop()?.toUpperCase()
    const size = media.file?.entity?.filesize
    return {
      uuid: media.uuid,
      name: media.name,
      href,
      meta: [extension, size ? formatSize(size) : undefined]
        .filter(Boolean)
        .join(', '),
    }
  }),
)

const { parentType, fieldListType } = defineBlokkli({
  bundle: 'downloads',
  globalOptions: ['bkVisibleLanguages'],
  editor: {
    icon: 'bk_mdi_download',
    editTitle: (el) => el.querySelector('a span')?.textContent,
  },
})
</script>
