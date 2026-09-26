<template>
  <div
    v-blokkli-droppable:field_documents
    :class="{ 'container-content': !parentType }"
  >
    <ul class="divide-y divide-stone-300 border-y border-stone-300">
      <li v-for="item in items" :key="item.uuid">
        <a
          :href="item.href"
          class="flex items-baseline justify-between gap-4 py-3 hover:underline"
        >
          <span class="font-semibold">{{ item.name }}</span>
          <span class="shrink-0 text-sm text-stone-600">
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

const props = defineProps<ParagraphDownloadsFragment>()

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`
  }
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
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

const { parentType } = defineBlokkli({
  bundle: 'downloads',
  globalOptions: ['bkVisibleLanguages'],
  editor: {
    icon: 'bk_mdi_download',
    editTitle: (el) => el.querySelector('a span')?.textContent,
  },
})
</script>
