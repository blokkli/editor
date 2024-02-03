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
import { Icon } from '#blokkli/components'
import { frameEventBus } from './../../../../../helpers/frameEventBus'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'

defineProps<{
  detached?: boolean
}>()

const route = useRoute()

const { selection, broadcast } = useBlokkli()

watch(selection.uuids, (selectedUuids) => {
  frameEventBus.emit('selectItems', selectedUuids)
})

const isLoading = ref(true)
const iframe = ref<HTMLIFrameElement | null>(null)

const src = computed(() =>
  route.fullPath.replace('blokkliEditing', 'blokkliPreview'),
)

onBlokkliEvent('updateMutatedFields', (e) =>
  frameEventBus.emit('mutatedFields', e.fields),
)
onBlokkliEvent('select', (uuid) => frameEventBus.emit('focus', uuid))
onBlokkliEvent('option:update', (e) => frameEventBus.emit('updateOption', e))

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
  broadcast.on('previewFocused', onPreviewFocused)
})

onBeforeUnmount(() => {
  frameEventBus.off('*', onFrameEventBusEvent)
  broadcast.off('previewFocused', onPreviewFocused)
})
</script>
