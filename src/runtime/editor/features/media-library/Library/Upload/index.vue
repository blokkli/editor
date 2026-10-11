<template>
  <div class="bk-media-library-filters-listview">
    <button
      type="button"
      :title="$t('mediaLibraryUpload', 'Upload files')"
      :aria-label="$t('mediaLibraryUpload', 'Upload files')"
      data-test="media-library-upload"
      @click="inputEl?.click()"
    >
      <Icon name="bk_mdi_upload" />
    </button>
    <input
      ref="inputEl"
      type="file"
      multiple
      class="hidden"
      :accept
      data-test="media-library-upload-input"
      @change="onChange"
    />
  </div>
</template>

<script lang="ts" setup>
import { useBlokkli, useTemplateRef } from '#imports'
import { Icon } from '#blokkli/editor/components'
import type { UploadType } from '#blokkli/editor/types/uploads'

const props = defineProps<{
  /**
   * The upload types whose files can be uploaded.
   */
  types: UploadType[]
}>()

const emit = defineEmits<{
  /**
   * Files are picked.
   */
  (e: 'pick', files: File[]): void
}>()

const { $t } = useBlokkli()

const inputEl = useTemplateRef('inputEl')

// Only images, unless files can be uploaded too.
const accept = props.types.includes('file') ? undefined : 'image/*'

function onChange() {
  const input = inputEl.value
  if (!input?.files?.length) {
    return
  }
  const picked = [...input.files]
  // So that the same files can be picked again.
  input.value = ''
  emit('pick', picked)
}
</script>
