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
        <div
          class="bk-dialog-content-element"
          :class="[backgroundClass, { 'bk-default-bg': !backgroundClass }]"
          :style="backgroundClass ? {} : { backgroundColor }"
        >
          <div ref="previewEl" />
        </div>
      </FormItem>
    </div>
  </DialogModal>
</template>

<script lang="ts" setup>
import { ref, useBlokkli, onMounted, useTemplateRef, watch } from '#imports'
import {
  DialogModal,
  InfoBox,
  FormText,
  FormItem,
} from '#blokkli/editor/components'
import { realBackgroundColor } from '#blokkli/editor/helpers/dom'

defineEmits<{
  (e: 'confirm', label: string): void
  (e: 'cancel'): void
}>()

const { dom, $t, blocks, ui } = useBlokkli()

const props = defineProps<{
  uuid: string
  backgroundClass?: string
}>()

const label = ref('')
const width = ref(450)
const previewEl = useTemplateRef('previewEl')
const backgroundColor = ref('')

watch(
  label,
  () => {
    ui.requireDialogCloseConfirm()
  },
  {
    once: true,
  },
)

onMounted(() => {
  if (previewEl.value) {
    const item = blocks.getBlock(props.uuid)
    if (!item) {
      return
    }

    // if (item.editTitle) {
    //   label.value = item.editTitle.substring(0, 40)
    // }

    const element = dom.getDragElement(item)
    if (!element) {
      return
    }
    const markup = dom.getDropElementMarkup(item)
    width.value = element.getBoundingClientRect().width + 40
    const clone = document.createElement('div')
    clone.innerHTML = markup
    previewEl.value.appendChild(clone)
    backgroundColor.value = realBackgroundColor(element)
  }
})
</script>
