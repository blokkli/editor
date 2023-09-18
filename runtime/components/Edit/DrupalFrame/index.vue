<template>
  <div class="pb-drupal-modal" @click.capture="" @mousedown.prevent.stop="">
    <div class="pb-drupal-modal-background"></div>
    <Resizable class="pb-drupal-modal-resizable">
      <div class="pb-drupal-modal-header">
        <ParagraphIcon v-if="bundle" :bundle="bundle" />
        <div v-else class="pb-paragraph-icon">
          <IconForm />
        </div>
        <span>{{ title }}</span>
        <button @click="$emit('close')">
          <IconClose />
        </button>
      </div>
      <div class="pb-drupal-modal-iframe">
        <iframe
          allowtransparency
          :src="url"
          class="pb-drupal-iframe"
          ref="iframe"
          @load="onIFrameLoad"
        ></iframe>
      </div>
    </Resizable>
  </div>
</template>

<script lang="ts" setup>
import Resizable from './../Resizable/index.vue'
import IconClose from './../Icons/Close.vue'
import IconForm from './../Icons/Form.vue'
import ParagraphIcon from './../ParagraphIcon/index.vue'
import { PbType } from '../../../types'

const props = defineProps<{
  url: string
  bundle?: string
  allTypes: PbType[]
  translationLabel?: string
}>()

const emit = defineEmits(['close', 'submit', 'submitEntityForm'])
const dialogWidth = ref(0)
const iframe = ref<HTMLIFrameElement | null>(null)

const title = computed(() => {
  if (!props.bundle) {
    return props.translationLabel
      ? `Seite übersetzen (${props.translationLabel})`
      : 'Seite bearbeiten'
  }
  const bundleTitle =
    props.allTypes.find((v) => v.id === props.bundle)?.label || props.bundle

  return props.translationLabel
    ? `${bundleTitle} übersetzen (${props.translationLabel})`
    : `${bundleTitle} bearbeiten`
})

function onMessage(e: MessageEvent): void {
  if (!e.data || typeof e.data !== 'object') {
    return
  }
  if (e.data.event !== 'PARAGRAPHS_BUILDER') {
    return
  }

  const { action, value } = e.data

  if (action === 'SAVE') {
    if (props.bundle) {
      emit('submit')
    } else {
      emit('submitEntityForm')
    }
  } else if (action === 'DIALOG_WIDTH') {
    dialogWidth.value = value
  } else if (action === 'CANCEL') {
    emit('close')
  }
}

function onIFrameLoad() {
  if (iframe.value?.contentWindow) {
    iframe.value.contentWindow?.focus()
  }
}

onMounted(() => {
  window.addEventListener('message', onMessage)
})

onUnmounted(() => {
  window.removeEventListener('message', onMessage)
})
</script>

<style lang="postcss"></style>
