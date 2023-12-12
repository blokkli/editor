<template>
  <div class="bk-drupal-modal-iframe">
    <iframe
      ref="iframe"
      allowtransparency
      :src="url"
      class="bk-drupal-iframe"
      @load="onIFrameLoad"
    />
  </div>
</template>

<script lang="ts" setup>
import { useBlokkli, onUnmounted, onMounted } from '#imports'
import type { AdapterFormFrameBuilder } from '#blokkli/adapter'

const { eventBus } = useBlokkli()

const iframe = ref<HTMLIFrameElement | null>(null)

const emit = defineEmits<{
  (e: 'updateWidth', width: number): void
  (e: 'close'): void
}>()

const props = defineProps<{
  url: string
  form: AdapterFormFrameBuilder
}>()

function onIFrameLoad() {
  if (iframe.value?.contentWindow) {
    iframe.value.contentWindow?.focus()
  }
}

function onMessage(e: MessageEvent): void {
  if (!e.data || typeof e.data !== 'object') {
    return
  }
  if (e.data.event !== 'BLOKKLI') {
    return
  }

  const { action, value } = e.data

  if (action === 'SAVE') {
    if (
      props.form.id === 'entity:edit' ||
      props.form.id === 'entity:translate'
    ) {
      eventBus.emit('reloadEntity')
    } else {
      eventBus.emit('reloadState')
    }
    emit('close')
  } else if (action === 'DIALOG_WIDTH' && typeof value === 'number') {
    emit('updateWidth', value)
  } else if (action === 'CANCEL') {
    emit('close')
  }
}

onMounted(() => {
  window.addEventListener('message', onMessage)
})

onUnmounted(() => {
  window.removeEventListener('message', onMessage)
})
</script>
