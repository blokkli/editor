<template>
  <FileDropHandler
    v-if="types.length"
    class="h-full"
    icon="bk_mdi_upload"
    :label="$t('mediaLibraryDropFiles', 'Drop files to upload')"
    :accept="canUpload"
    @drop="emit('drop', $event)"
  >
    <slot />
  </FileDropHandler>
  <slot v-else />
</template>

<script lang="ts" setup>
import { useBlokkli } from '#imports'
import { FileDropHandler } from '#blokkli/editor/components'
import { getUploadType } from '#blokkli/editor/helpers/uploads'
import type { UploadType } from '#blokkli/editor/types/uploads'

defineProps<{
  /**
   * The upload types whose files can be uploaded. Without any, files dragged
   * over the library are the page's, as anywhere else in the editor.
   */
  types: UploadType[]
}>()

const emit = defineEmits<{
  /**
   * Files are dropped on the library.
   */
  (e: 'drop', files: File[]): void
}>()

const { $t, adapter } = useBlokkli()

function canUpload(item: DataTransferItem): boolean {
  // Only a file's MIME type is known while it's dragged.
  return !!adapter.getUploadMediaBundle?.({
    type: getUploadType(item.type),
    fileType: item.type,
  })
}
</script>
