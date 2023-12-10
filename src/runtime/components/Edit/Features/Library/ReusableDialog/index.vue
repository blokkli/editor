<template>
  <DialogModal
    :title="text('libraryDialogTitle')"
    :lead="text('libraryDialogLead')"
    :width="1200"
    :submit-label="text('libraryDialogSubmit')"
    :can-submit="!!label.length"
    @submit="$emit('confirm', label)"
    @cancel="$emit('cancel')"
  >
    <div class="bk-dialog-form">
      <label for="reusable_label" class="bk-form-label">{{
        text('libraryDialogDescriptionLabel')
      }}</label>
      <input
        id="reusable_label"
        v-model="label"
        type="text"
        class="bk-form-input"
        :placeholder="text('libraryDialogTitleInputPlaceholder')"
        required
      />
    </div>
    <div class="bk-form-label">
      {{ text('libraryPreviewLabel') }}
    </div>
    <div
      class="bk-dialog-content-element"
      :class="[backgroundClass, { 'bk-default-bg': !backgroundClass }]"
    >
      <div ref="previewEl" />
    </div>
  </DialogModal>
</template>

<script lang="ts" setup>
import { ref, useBlokkli, onMounted } from '#imports'

import { DialogModal } from '#blokkli/components'

defineEmits<{
  (e: 'confirm', label: string): void
  (e: 'cancel'): void
}>()

const { dom, text } = useBlokkli()

const props = defineProps<{
  uuid: string
  backgroundClass?: string
}>()

const label = ref('')

const width = ref(450)

const previewEl = ref<HTMLDivElement | null>(null)

onMounted(() => {
  if (previewEl.value) {
    const item = dom.findBlock(props.uuid)
    if (!item) {
      return
    }

    if (item.editTitle) {
      label.value = item.editTitle.substring(0, 40)
    }

    width.value = item.element.getBoundingClientRect().width + 40
    const markup = item.element.outerHTML
    const clone = document.createElement('div')
    clone.innerHTML = markup
    const cloneEl = clone.firstElementChild
    if (cloneEl instanceof HTMLElement) {
      Object.keys(cloneEl.dataset).forEach((dataKey) => {
        delete cloneEl.dataset[dataKey]
      })
    }
    previewEl.value.appendChild(clone)
  }
})
</script>
