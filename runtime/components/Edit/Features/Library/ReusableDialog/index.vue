<template>
  <DialogModal
    :title="title"
    :lead="lead"
    :width="1200"
    :submitLabel="title"
    :can-submit="!!label.length"
    @submit="$emit('confirm', label)"
    @cancel="$emit('cancel')"
  >
    <div class="pb-dialog-form">
      <label for="reusable_label" class="pb-form-label">Beschreibung</label>
      <input
        v-model="label"
        type="text"
        id="reusable_label"
        class="pb-form-input"
        placeholder="Teaser Kampagne 2023"
        required
      />
    </div>
    <div class="pb-form-label">Vorschau</div>
    <div
      class="pb-dialog-content-element"
      :class="[backgroundClass, { 'pb-default-bg': !backgroundClass }]"
    >
      <div ref="paragraph"></div>
    </div>
  </DialogModal>
</template>

<script lang="ts" setup>
import { DialogModal } from '#pb/components'

defineEmits<{
  (e: 'confirm', label: string): void
  (e: 'cancel'): void
}>()

const props = defineProps<{
  uuid: string
  backgroundClass?: string
}>()

const label = ref('')

const width = ref(450)

const paragraph = ref<HTMLDivElement | null>(null)

const title = 'Zur Bibliothek hinzufügen'
const lead =
  'Wenn Sie einen Paragraph zur Bibliothek hinzufügen können Sie diesen auf mehreren Seiten gleichzeitig verwenden. Änderungen an diesem Paragraph sind dann sofort auf allen Seiten publiziert.'

onMounted(() => {
  if (paragraph.value) {
    const el = document.querySelector(`[data-uuid="${props.uuid}"]`)
    if (el && el instanceof HTMLElement) {
      width.value = el.getBoundingClientRect().width + 40
      const markup = el.outerHTML
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
  }
})
</script>
