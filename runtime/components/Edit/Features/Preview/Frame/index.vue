<template>
  <div class="pb-preview" :style="style">
    <div v-if="isLoading" class="pb-preview-loading">
      <Icon name="spinner" />
    </div>
    <div class="pb-preview-iframe">
      <iframe ref="iframe" :src="src" @load="isLoading = false" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import type {
  UpdateMutatedFieldsEvent,
  UpdateParagraphOptionEvent,
} from '#pb/types'
import { Icon } from '#pb/components'

const route = useRoute()

const { eventBus, selection } = useBlokkli()

watch(selection.uuids, (selectedUuids) => {
  postMessageToIframe('paragraphsBuilderSelect', selectedUuids)
})

const isLoading = ref(true)
const iframe = ref<HTMLIFrameElement | null>(null)
const width = ref(400)

const style = computed(() => {
  return {
    width: width.value + 'px',
  }
})

const src = computed(() => route.fullPath.replace('pbEditing', 'pbPreview'))

const postMessageToIframe = (name: string, data: any) =>
  iframe.value?.contentWindow?.postMessage({
    name,
    data: JSON.parse(JSON.stringify(data)),
  })

const onUpdateMutatedFields = (e: UpdateMutatedFieldsEvent) =>
  postMessageToIframe('paragraphsBuilderMutatedFields', e.fields)

const onSelectParagraph = (uuid: string) =>
  postMessageToIframe('paragraphsBuilderFocus', uuid)

const onUpdateOption = (option: UpdateParagraphOptionEvent) =>
  postMessageToIframe('paragraphsBuilderUpdateOption', option)

onMounted(() => {
  eventBus.on('option:update', onUpdateOption)
  eventBus.on('updateMutatedFields', onUpdateMutatedFields)
  eventBus.on('select', onSelectParagraph)
})

onBeforeUnmount(() => {
  eventBus.off('option:update', onUpdateOption)
  eventBus.off('updateMutatedFields', onUpdateMutatedFields)
  eventBus.off('select', onSelectParagraph)
})
</script>
