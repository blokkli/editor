<template>
  <div
    v-blokkli-droppable:field_documents
    :class="{ 'container-content': !parentType && fieldListType === 'default' }"
  >
    <h2
      v-if="fieldListType === 'sidebar'"
      class="pb-2.5 text-label text-muted uppercase"
    >
      {{ $texts('downloads.label', 'Downloads') }}
    </h2>
    <LinkList download :items />
  </div>
</template>

<script lang="ts" setup>
import { computed, defineBlokkli } from '#imports'
import type { ParagraphDownloadsFragment } from '#graphql-operations'
import LinkList from '~/components/LinkList/index.vue'
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
    const url = media?.mediaFileUrl?.path
    if (!url) {
      return []
    }
    const extension = url.split('.').pop()?.toUpperCase()
    const size = media.file?.entity?.filesize
    return {
      label: media.name ?? url,
      url,
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
