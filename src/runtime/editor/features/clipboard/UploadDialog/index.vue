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
    <PanelSection
      v-for="(item, index) in uploads.items"
      :key="index"
      :title="item.file.name"
      padded
      data-test="clipboard-upload-item"
      :data-test-status="item.status"
    >
      <template #post-title>
        <StatusIcon :status="getStatus(item)" />
        <span class="text-sm text-mono-500">
          {{ formatSize(item.file.size) }}
        </span>
      </template>
      <div class="flex gap-15">
        <img
          v-if="thumbnails[index]"
          :src="thumbnails[index]"
          alt=""
          class="size-80 shrink-0 object-contain bg-mono-100"
        />
        <div
          v-else
          class="size-80 shrink-0 flex items-center justify-center bg-mono-100 text-mono-400"
        >
          <Icon name="bk_mdi_attach_file" class="size-30" />
        </div>
        <div class="flex-1 min-w-0">
          <div
            v-if="item.status === 'queued' || item.status === 'uploading'"
            class="h-5 mt-10 bg-mono-200 rounded-full overflow-hidden"
          >
            <div
              class="h-full bg-accent-700"
              :style="{ width: item.progress * 100 + '%' }"
            />
          </div>
          <InfoBox
            v-else-if="item.status === 'failed'"
            color="red"
            icon="bk_mdi_error"
            small
          >
            <p>
              {{
                item.error ||
                $t('clipboardUploadFailed', "The file couldn't be uploaded.")
              }}
            </p>
            <button
              class="bk-button bk-is-small mt-10"
              @click="uploads.retry(item)"
            >
              {{ $t('clipboardUploadRetry', 'Try again') }}
            </button>
          </InfoBox>
          <p v-else-if="item.duplicate !== null">
            {{
              $t(
                'clipboardUploadDuplicate',
                'The file exists as the media "@label", which is added.',
              ).replace('@label', item.duplicate)
            }}
          </p>
          <p v-else-if="item.mediaId">
            {{ $t('clipboardUploadCreated', 'The media is created.') }}
          </p>
          <template v-else-if="item.form">
            <InfoBox
              v-if="!item.form.complete"
              color="red"
              icon="bk_mdi_error"
              small
              class="mb-10"
            >
              {{
                $t(
                  'clipboardUploadIncomplete',
                  "The media needs a field that can't be filled in here.",
                )
              }}
            </InfoBox>
            <ConfigForm
              v-model="item.values"
              :config="item.form.inputs"
              :errors="item.errors"
            />
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
      </div>
    </PanelSection>
  </DialogModal>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, ref, useBlokkli } from '#imports'
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
import type {
  AddBlocksFromUploadsEvent,
  ClipboardFileGroup,
  ClipboardUploadType,
} from '../types'
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
const thumbnails = props.files.map((file) =>
  file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
)

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
    .filter((group) => group.bundles.length > 1)
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

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
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

onBeforeUnmount(() => {
  uploads.abort()
  thumbnails.forEach((url) => url && URL.revokeObjectURL(url))
})
</script>
