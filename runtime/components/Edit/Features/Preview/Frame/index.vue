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
import type { UpdateMutatedFieldsEvent } from '#pb/types'
import { Icon } from '#pb/components'

const route = useRoute()

const { eventBus } = useParagraphsBuilderStore()

const isLoading = ref(true)
const iframe = ref<HTMLIFrameElement | null>(null)
const width = ref(400)

const style = computed(() => {
  return {
    width: width.value + 'px',
  }
})

const src = computed(() => {
  return route.fullPath.replace('pbEditing', 'pbPreview')
})

function postMessageToIframe(name: string, data: any) {
  iframe.value?.contentWindow?.postMessage({
    name,
    data,
  })
}

function onUpdateMutatedFields(e: UpdateMutatedFieldsEvent) {
  postMessageToIframe('paragraphsBuilderMutatedFields', e.fields)
}

function onSelectParagraph(uuid: string) {
  postMessageToIframe('paragraphsBuilderFocus', uuid)
}

onMounted(() => {
  eventBus.on('updateMutatedFields', onUpdateMutatedFields)
  eventBus.on('select', onSelectParagraph)
})

onBeforeUnmount(() => {
  eventBus.off('updateMutatedFields', onUpdateMutatedFields)
  eventBus.off('select', onSelectParagraph)
})
</script>
