<template>
  <div
    class="relative h-full flex flex-col bk"
    @scroll.stop
    @touchstart.stop.capture.prevent
    @touchmove.stop.capture.prevent
  >
    <NotEditStateInfo v-if="isNotEditState" />
    <div class="relative flex-1">
      <iframe
        ref="iframe"
        allowtransparency
        :src="url"
        class="absolute top-0 left-0 size-full"
        @load="onIFrameLoad"
      />
    </div>
    <BlokkliTransition name="loading">
      <Loading v-if="!isLoaded" />
    </BlokkliTransition>
  </div>
</template>

<script lang="ts" setup>
import {
  ref,
  useBlokkli,
  onUnmounted,
  onMounted,
  useTemplateRef,
  computed,
} from '#imports'
import type { AdapterFormFrameBuilder } from '#blokkli/editor/adapter'
import {
  Loading,
  BlokkliTransition,
  NotEditStateInfo,
} from '#blokkli/editor/components'

const { eventBus } = useBlokkli()

const iframe = useTemplateRef('iframe')
const isLoaded = ref(false)

const emit = defineEmits<{
  (e: 'close'): void
}>()

const props = defineProps<{
  url: string
  form: AdapterFormFrameBuilder
}>()

const isNotEditState = computed<boolean>(() => {
  return props.form.id === 'entity:edit' || props.form.id === 'entity:translate'
})

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
