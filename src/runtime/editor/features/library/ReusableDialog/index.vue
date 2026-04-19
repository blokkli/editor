<template>
  <DialogModal
    id="library-reusable"
    :title="$t('libraryDialogTitle', 'Add to library')"
    :lead="
      $t(
        'libraryDialogLead',
        'When you add an item to the library, you can use it on multiple pages at the same time. Changes to this item are then immediately published on all pages.',
      )
    "
    :width="1200"
    icon="reusable"
    :submit-label="$t('libraryDialogSubmit', 'Add to library')"
    :can-submit="!!label.length"
    @submit="$emit('confirm', label)"
    @cancel="$emit('cancel')"
  >
    <div class="bk-reusable-dialog-form">
      <InfoBox
        :text="
          $t(
            'libraryDialogReusableInfo',
            'The library item will be available for placement on other pages once this page has been published.',
          )
        "
      />
      <FormItem>
        <FormText
          id="reusable_label"
          v-model="label"
          lazy
          :label="$t('libraryDialogDescriptionLabel', 'Description')"
          type="text"
          :placeholder="
            $t(
              'libraryDialogTitleInputPlaceholder',
              'e.g. Teaser Campaign 2024',
            )
          "
          required
        />
      </FormItem>
      <FormItem>
        <div class="bk-form-label">
          {{ $t('libraryPreviewLabel', 'Preview') }}
        </div>
        <BlockPreviewRenderer :uuids="[uuid]" />
      </FormItem>
    </div>
  </DialogModal>
</template>

<script lang="ts" setup>
import { ref, useBlokkli, watch } from '#imports'
import {
  DialogModal,
  InfoBox,
  FormText,
  FormItem,
  BlockPreviewRenderer,
} from '#blokkli/editor/components'

defineEmits<{
  (e: 'confirm', label: string): void
  (e: 'cancel'): void
}>()

const { $t, ui } = useBlokkli()

defineProps<{
  uuid: string
  backgroundClass?: string
}>()

const label = ref('')

watch(
  label,
  () => {
    ui.requireDialogCloseConfirm()
  },
  {
    once: true,
  },
)
</script>
