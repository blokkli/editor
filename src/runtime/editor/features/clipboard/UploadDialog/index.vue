<template>
  <DialogModal
    id="clipboard-upload"
    :title="$t('clipboardUploadTitle', 'Add files')"
    icon="bk_mdi_upload"
    :submit-label="$t('clipboardUploadSubmit', 'Add')"
    :can-submit="uploads.isReady.value && !isCreating"
    :is-loading="isCreating"
    mono
    @submit="onSubmit"
    @cancel="onCancel"
  >
    <PanelSection
      v-if="choices.length"
      :title="$t('clipboardUploadBundles', 'Block types')"
      padded
    >
      <div class="flex flex-col gap-15">
        <FormRadioTabs
          v-for="choice in choices"
          :id="'clipboard-upload-bundle-' + choice.type"
          :key="choice.type"
          v-model="bundles[choice.type]"
          :label="choice.label"
          :options="choice.options"
        />
      </div>
    </PanelSection>
    <PanelSection :title="filesTitle">
      <ul>
        <li
          v-for="item in uploads.items"
          :key="item.id"
          class="flex gap-15 p-panel-gap border-b border-b-mono-300 last:border-b-0"
          data-test="clipboard-upload-item"
          :data-test-status="item.status"
        >
          <FocalPoint
            v-if="thumbnails.get(item.file) && getFocalPoint(item)"
            v-model="item.values[getFocalPoint(item)!.name]"
            :src="thumbnails.get(item.file)!"
            :label="getFocalPoint(item)!.label"
            @error="thumbnails.delete(item.file)"
          />
          <img
            v-else-if="thumbnails.get(item.file)"
            :src="thumbnails.get(item.file)"
            alt=""
            class="w-[160px] h-120 shrink-0 object-contain bg-mono-200"
            @error="thumbnails.delete(item.file)"
          />
          <div
            v-else
            class="w-[160px] h-120 shrink-0 flex flex-col items-center justify-center gap-5 bg-mono-200 text-mono-500"
          >
            <Icon name="bk_mdi_docs" class="size-40" />
            <span
              class="text-xs font-bold uppercase tracking-wide text-mono-600"
            >
              {{ getExtension(item.file) }}
            </span>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-10">
              <span class="font-semibold truncate">{{ item.file.name }}</span>
              <span class="text-sm text-mono-500 whitespace-nowrap">
                {{ formatSize(item.file.size) }}
              </span>
              <StatusIcon :status="getStatus(item)" class="ml-auto" />
            </div>
            <div
              v-if="item.status === 'queued' || item.status === 'uploading'"
              class="flex items-center gap-10 mt-8"
            >
              <div class="flex-1 h-5 bg-mono-200 rounded-full overflow-hidden">
                <div
                  class="h-full bg-accent-700"
                  :style="{ width: item.progress * 100 + '%' }"
                />
              </div>
              <span class="text-sm text-mono-500 tabular-nums">
                {{ formatProgress(item.progress) }}
              </span>
            </div>
            <div
              v-else-if="item.status === 'failed'"
              class="flex items-center gap-10 mt-8 text-sm text-red-dark"
            >
              <span>
                {{
                  item.error ||
                  $t('clipboardUploadFailed', "The file couldn't be uploaded.")
                }}
              </span>
              <button
                type="button"
                class="bk-button bk-scheme-mono bk-is-light bk-is-small ml-auto shrink-0"
                @click="uploads.retry(item)"
              >
                {{ $t('clipboardUploadRetry', 'Try again') }}
              </button>
              <button
                type="button"
                class="bk-button bk-scheme-mono bk-is-light bk-is-small shrink-0"
                data-test="clipboard-upload-remove"
                @click="onRemove(item)"
              >
                {{ $t('remove', 'Remove') }}
              </button>
            </div>
            <p
              v-else-if="item.duplicate !== null"
              class="mt-8 text-sm text-mono-700"
            >
              {{
                $t(
                  'clipboardUploadDuplicate',
                  'The file exists as the media "@label", which is added.',
                ).replace('@label', item.duplicate)
              }}
            </p>
            <p v-else-if="item.mediaId" class="mt-8 text-sm text-mono-700">
              {{ $t('clipboardUploadCreated', 'The media is created.') }}
            </p>
            <template v-else-if="item.form">
              <InfoBox
                v-if="!item.form.complete"
                color="red"
                icon="bk_mdi_error"
                small
                class="mt-8"
              >
                {{
                  $t(
                    'clipboardUploadIncomplete',
                    "The media needs a field that can't be filled in here.",
                  )
                }}
              </InfoBox>
              <ConfigForm
                v-if="hasFields(item.form)"
                v-model="item.values"
                :config="item.form.inputs"
                :errors="item.errors"
                stacked
                class="mt-8"
              />
              <p
                v-else-if="item.form.complete && !getFocalPoint(item)"
                class="mt-8 text-sm text-mono-500"
              >
                {{ $t('clipboardUploadNoFields', 'Nothing to fill in.') }}
              </p>
              <InfoBox
                v-for="(message, i) in item.messages"
                :key="i"
                color="red"
                icon="bk_mdi_error"
                small
                class="mt-10"
              >
                {{ message }}
              </InfoBox>
            </template>
          </div>
        </li>
      </ul>
    </PanelSection>
  </DialogModal>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, reactive, ref, useBlokkli } from '#imports'
import {
  ConfigForm,
  DialogModal,
  FormRadioTabs,
  Icon,
  InfoBox,
  StatusIcon,
} from '#blokkli/editor/components'
import PanelSection from '#blokkli/editor/components/Panel/Section/index.vue'
import { emitMessage } from '#blokkli/editor/events'
import type { PluginConfigInputFocalPoint } from '#blokkli/editor/types/pluginConfig'
import type {
  AddBlocksFromUploadsEvent,
  ClipboardFileGroup,
  ClipboardUploadForm,
  ClipboardUploadType,
} from '../types'
import FocalPoint from './FocalPoint/index.vue'
import { createUploads, type UploadItem, type UploadMethods } from './uploads'

const props = defineProps<{
  /**
   * The files, in the order their blocks are added.
   */
  files: File[]
  /**
   * The bundles each type of file can be added with.
   */
  groups: ClipboardFileGroup[]
}>()

const emit = defineEmits<{
  (e: 'done', items: AddBlocksFromUploadsEvent['items']): void
  (e: 'cancel'): void
}>()

const { $t, ui, types, adapter } = useBlokkli()

// The dialog is only shown when the adapter can upload.
const uploads = createUploads(props.files, adapter as UploadMethods)
uploads.start()

// The images' thumbnails, while the dialog is shown.
const thumbnailUrls = new Map(
  props.files
    .filter((file) => file.type.startsWith('image/'))
    .map((file) => [file, URL.createObjectURL(file)]),
)

// A file that can't be shown as an image gets the icon instead.
const thumbnails = reactive(new Map(thumbnailUrls))

const isCreating = ref(false)

/**
 * The bundle of each type's blocks: the first, unless another is picked.
 */
const bundles = ref<Partial<Record<ClipboardUploadType, string>>>(
  Object.fromEntries(
    props.groups.map((group) => [group.type, group.bundles[0]]),
  ),
)

/**
 * The types whose bundle can be picked.
 */
const choices = computed(() =>
  props.groups
    .filter(
      (group) =>
        group.bundles.length > 1 &&
        uploads.items.some((item) => item.type === group.type),
    )
    .map((group) => ({
      type: group.type,
      label:
        group.type === 'image'
          ? $t('clipboardUploadImages', 'Images')
          : $t('clipboardUploadFiles', 'Files'),
      options: group.bundles.map((bundle) => ({
        value: bundle,
        label: types.getBlockBundleDefinition(bundle)?.label || bundle,
      })),
    })),
)

/**
 * The focal point of an image, set on its preview: once its form is loaded,
 * until its media is created.
 */
function getFocalPoint(
  item: UploadItem,
): PluginConfigInputFocalPoint | undefined {
  if (item.mediaId) {
    return undefined
  }
  return item.form?.inputs.find(
    (input): input is PluginConfigInputFocalPoint =>
      input.type === 'focalPoint',
  )
}

/**
 * Whether a form has fields to fill in, besides a focal point.
 */
function hasFields(form: ClipboardUploadForm): boolean {
  return form.inputs.some((input) => input.type !== 'focalPoint')
}

function getStatus(
  item: UploadItem,
): 'pending' | 'active' | 'success' | 'error' {
  if (
    item.status === 'failed' ||
    item.messages.length ||
    Object.keys(item.errors).length ||
    (item.form && !item.form.complete)
  ) {
    return 'error'
  } else if (item.status === 'uploaded') {
    return 'success'
  } else if (item.status === 'uploading') {
    return 'active'
  }
  return 'pending'
}

const filesTitle = computed(() =>
  uploads.items.length === 1
    ? $t('clipboardUploadOneFile', '1 file')
    : $t('clipboardUploadFileCount', '@count files').replace(
        '@count',
        uploads.items.length.toString(),
      ),
)

function getExtension(file: File): string {
  const parts = file.name.split('.')
  return parts.length > 1 ? parts.pop()! : ''
}

function formatProgress(progress: number): string {
  return ui.formatNumber(progress, {
    style: 'percent',
    maximumFractionDigits: 0,
  })
}

function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return ui.formatNumber(bytes, { style: 'unit', unit: 'byte' })
  } else if (bytes < 1024 * 1024) {
    return ui.formatNumber(bytes / 1024, {
      style: 'unit',
      unit: 'kilobyte',
      maximumFractionDigits: 0,
    })
  }
  return ui.formatNumber(bytes / 1024 / 1024, {
    style: 'unit',
    unit: 'megabyte',
    maximumFractionDigits: 1,
  })
}

async function onSubmit() {
  if (!uploads.isReady.value || isCreating.value) {
    return
  }
  isCreating.value = true
  try {
    if (await uploads.createMedia()) {
      emit(
        'done',
        uploads.items.map((item) => ({
          type: item.type,
          mediaId: item.mediaId!,
          bundle: bundles.value[item.type]!,
        })),
      )
    }
  } catch (e) {
    emitMessage(
      $t('clipboardUploadCreateFailed', "The media couldn't be created."),
      'error',
      e,
    )
  } finally {
    isCreating.value = false
  }
}

function onCancel() {
  uploads.abort()
  emit('cancel')
}

function onRemove(item: UploadItem) {
  uploads.remove(item)
  // Without files, there's nothing left to add.
  if (!uploads.items.length) {
    onCancel()
  }
}

onBeforeUnmount(() => {
  uploads.abort()
  thumbnailUrls.forEach((url) => URL.revokeObjectURL(url))
})
</script>
