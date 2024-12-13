<template>
  <div
    class="bk-form-overlay-iframe"
    @scroll.stop
    @touchstart.stop.capture.prevent
    @touchmove.stop.capture.prevent
  >
    <iframe ref="iframe" allowtransparency :src="url" @load="onIFrameLoad" />
    <Transition name="bk-loading">
      <Loading v-if="!isLoaded" />
    </Transition>
  </div>
</template>

<script lang="ts" setup>
import { ref, useBlokkli, onUnmounted, onMounted } from '#imports'
import type { AdapterFormFrameBuilder } from '#blokkli/adapter'
import { Loading } from '#blokkli/components'

const { eventBus } = useBlokkli()

const iframe = ref<HTMLIFrameElement | null>(null)
const isLoaded = ref(false)

const emit = defineEmits<{
  (e: 'close'): void
}>()

const props = defineProps<{
  url: string
  form: AdapterFormFrameBuilder
}>()

function onIFrameLoad() {
  isLoaded.value = true
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

  const { action } = e.data

  if (action === 'SAVE') {
    if (
      props.form.id === 'entity:edit' ||
      props.form.id === 'entity:translate'
    ) {
      if (props.form.id === 'entity:translate') {
        const langcode = props.form.translation.id
        eventBus.emit('reloadEntity', () => {
          eventBus.emit('entity:translated', langcode)
        })
      } else {
        eventBus.emit('reloadEntity')
      }
    } else {
      eventBus.emit('reloadState')
    }
    emit('close')
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
