<template>
  <div class="bk-preview">
    <div v-if="isLoading" class="bk-preview-loading">
      <Icon name="spinner" />
    </div>
    <div v-if="detached" class="bk-preview-controls">
      <slot></slot>
    </div>
    <div class="bk-preview-iframe">
      <iframe ref="iframe" :src="src" @load="isLoading = false" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import {
  ref,
  computed,
  useBlokkli,
  onMounted,
  onBeforeUnmount,
  useRoute,
  watch,
} from '#imports'

import type {
  UpdateMutatedFieldsEvent,
  UpdateBlockOptionEvent,
} from '#blokkli/types'
import { Icon } from '#blokkli/components'
import { frameEventBus } from './../../../../../helpers/frameEventBus'

defineProps<{
  detached?: boolean
}>()

const route = useRoute()

const { eventBus, selection, broadcast } = useBlokkli()

watch(selection.uuids, (selectedUuids) => {
  frameEventBus.emit('selectItems', selectedUuids)
})

const isLoading = ref(true)
const iframe = ref<HTMLIFrameElement | null>(null)

const src = computed(() =>
  route.fullPath.replace('blokkliEditing', 'blokkliPreview'),
)

const onUpdateMutatedFields = (e: UpdateMutatedFieldsEvent) =>
  frameEventBus.emit('mutatedFields', e.fields)
const onSelect = (uuid: string) => frameEventBus.emit('focus', uuid)
const onUpdateOption = (option: UpdateBlockOptionEvent) =>
  frameEventBus.emit('updateOption', option)

/**
 * Emit the event to the iframe.
 */
const onFrameEventBusEvent = (name: any, data: any) =>
  iframe.value?.contentWindow?.postMessage({
    name: 'blokkli__' + name,
    data: JSON.parse(JSON.stringify(data)),
  })

const onPreviewFocused = () => {
  if (iframe.value) {
    iframe.value.focus()
  }
}

onMounted(() => {
  frameEventBus.on('*', onFrameEventBusEvent)
  eventBus.on('option:update', onUpdateOption)
  eventBus.on('updateMutatedFields', onUpdateMutatedFields)
  eventBus.on('select', onSelect)
  broadcast.on('previewFocused', onPreviewFocused)
})

onBeforeUnmount(() => {
  frameEventBus.off('*', onFrameEventBusEvent)
  eventBus.off('option:update', onUpdateOption)
  eventBus.off('updateMutatedFields', onUpdateMutatedFields)
  eventBus.off('select', onSelect)
  broadcast.off('previewFocused', onPreviewFocused)
})
</script>
