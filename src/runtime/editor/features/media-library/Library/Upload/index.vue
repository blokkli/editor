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
    <Teleport :to="ui.mainLayoutElement.value">
      <BlokkliTransition name="slide-up">
        <UploadDialog
          v-if="files"
          :files
          :title="$t('mediaLibraryUpload', 'Upload files')"
          @done="onDone"
          @cancel="files = null"
        />
      </BlokkliTransition>
    </Teleport>
  </div>
</template>

<script lang="ts" setup>
import {
  defineAsyncComponent,
  shallowRef,
  useBlokkli,
  useTemplateRef,
} from '#imports'
import { BlokkliTransition, Icon } from '#blokkli/editor/components'
import { emitMessage } from '#blokkli/editor/events'
import { getUploadFileInfo } from '#blokkli/editor/helpers/uploads'
import type { UploadType } from '#blokkli/editor/types/uploads'

const UploadDialog = defineAsyncComponent(
  () => import('#blokkli/editor/components/UploadDialog/index.vue'),
)

const props = defineProps<{
  /**
   * The upload types whose files can be uploaded.
   */
  types: UploadType[]
}>()

const emit = defineEmits<{
  /**
   * The files' media are created.
   */
  (e: 'uploaded'): void
}>()

const { $t, adapter, ui } = useBlokkli()

const inputEl = useTemplateRef('inputEl')

// The files of the upload dialog, while it's shown.
const files = shallowRef<File[] | null>(null)

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

  const refused = picked.find(
    (file) => !adapter.getUploadMediaBundle?.(getUploadFileInfo(file)),
  )
  if (refused) {
    emitMessage(
      $t(
        'uploadUnsupportedFile',
        'The type or size of "@name" is not supported.',
      ).replace('@name', refused.name),
      'error',
    )
    return
  }
  files.value = picked
}

function onDone() {
  files.value = null
  emit('uploaded')
}
</script>
