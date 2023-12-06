<template>
  <DialogModal
    :title="text('libraryDialogTitle')"
    :lead="text('libraryDialogLead')"
    :width="1200"
    :submitLabel="text('libraryDialogSubmit')"
    :can-submit="!!label.length"
    @submit="$emit('confirm', label)"
    @cancel="$emit('cancel')"
  >
    <div class="bk-dialog-form">
      <label for="reusable_label" class="bk-form-label">{{
        text('libraryDialogDescriptionLabel')
      }}</label>
      <input
        v-model="label"
        type="text"
        id="reusable_label"
        class="bk-form-input"
        :placeholder="text('libraryDialogTitleInputPlaceholder')"
        required
      />
    </div>
    <div class="bk-form-label">{{ text('libraryPreviewLabel') }}</div>
    <div
      class="bk-dialog-content-element"
      :class="[backgroundClass, { 'bk-default-bg': !backgroundClass }]"
    >
      <div ref="paragraph"></div>
    </div>
  </DialogModal>
</template>

<script lang="ts" setup>
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

const paragraph = ref<HTMLDivElement | null>(null)

onMounted(() => {
  if (paragraph.value) {
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
    paragraph.value.appendChild(clone)
  }
})
</script>
