<template>
  <DialogModal
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
    <div class="bk-dialog-form">
      <label for="reusable_label" class="bk-form-label">{{
        $t('libraryDialogDescriptionLabel', 'Description')
      }}</label>
      <input
        id="reusable_label"
        v-model="label"
        type="text"
        class="bk-form-input"
        :placeholder="
          $t('libraryDialogTitleInputPlaceholder', 'e.g. Teaser Campaign 2024')
        "
        required
      />
    </div>
    <div class="bk-form-label">
      {{ $t('libraryPreviewLabel', 'Preview') }}
    </div>
    <div
      class="bk-dialog-content-element"
      :class="[backgroundClass, { 'bk-default-bg': !backgroundClass }]"
      :style="backgroundClass ? {} : { backgroundColor }"
    >
      <div ref="previewEl" />
    </div>
  </DialogModal>
</template>

<script lang="ts" setup>
import { ref, useBlokkli, onMounted } from '#imports'

import { DialogModal } from '#blokkli/components'
import { realBackgroundColor } from '#blokkli/helpers'

defineEmits<{
  (e: 'confirm', label: string): void
  (e: 'cancel'): void
}>()

const { dom, $t } = useBlokkli()

const props = defineProps<{
  uuid: string
  backgroundClass?: string
}>()

const label = ref('')
const width = ref(450)
const previewEl = ref<HTMLDivElement | null>(null)
const backgroundColor = ref('')

onMounted(() => {
  if (previewEl.value) {
    const item = dom.findBlock(props.uuid)
    if (!item) {
      return
    }

    if (item.editTitle) {
      label.value = item.editTitle.substring(0, 40)
    }

    const element = item.element()
    const markup = dom.getDropElementMarkup(item)
    width.value = element.getBoundingClientRect().width + 40
    const clone = document.createElement('div')
    clone.innerHTML = markup
    previewEl.value.appendChild(clone)
    backgroundColor.value = realBackgroundColor(element)
  }
})
</script>
