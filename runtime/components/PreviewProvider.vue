<template>
  <slot></slot>
</template>

<script lang="ts" setup>
import { PbMutatedField } from '../types'

const props = defineProps<{
  entityType: string
  entityUuid: string
  bundle: string
}>()

let timeout: any = null
let lastChanged: number = 0

const { data, refresh } = await useAsyncData(() => {
  return useGraphqlQuery('paragraphsEditState', {
    entityType: props.entityType.toUpperCase() as any,
    entityUuid: props.entityUuid,
  }).then((v) => v.data.state?.mutatedState)
})

const mutatedFields = ref<PbMutatedField[]>([])

provide('paragraphsBuilderMutatedFields', mutatedFields)
provide('paragraphsBuilderPreview', true)

function onWheel(e: WheelEvent) {
  window.scrollBy(0, e.deltaY / 3)
}

function onMessage(e: MessageEvent) {
  if (e.data && typeof e.data === 'object') {
    if (e.data.name === 'paragraphsBuilderMutatedFields') {
      mutatedFields.value = [...e.data.data]
    } else if (e.data.name === 'paragraphsBuilderFocus') {
      const uuid = e.data.data
      const el = document.querySelector(`[data-uuid="${uuid}"]`)
      if (el) {
        el.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        })
      }
    }
  }
}

/**
 * Check the last changed date and update the mutated state if there is an
 * update.
 */
async function checkChangedDate() {
  clearTimeout(timeout)
  timeout = setTimeout(async () => {
    const response = await $fetch<any>(
      `/de/paragraphs_builder/${props.entityType}/${props.entityUuid}/last_changed`,
    )
    if (response && response.changed) {
      if (lastChanged !== 0 && lastChanged !== response.changed) {
        await refresh()
        mutatedFields.value = data.value?.fields || []
      }
      lastChanged = response.changed
      checkChangedDate()
    }
  }, 1000)
}

function isInIframe(): boolean {
  return window.parent !== window
}

onMounted(() => {
  mutatedFields.value = data.value?.fields || []

  if (isInIframe()) {
    // We are a preview inside the iframe of the main editing app.
    // In this case updated state is passed in via postMessage from the main
    // editing app. Also native scrolling is disabled and we handle it
    // ourselves.
    document.body.classList.add('pb-body-preview')
    window.addEventListener('wheel', onWheel)
    window.addEventListener('message', onMessage)
  } else {
    // We are a standalone page in preview mode. Setup polling for changes.
    checkChangedDate()
  }
})

onBeforeUnmount(() => {
  clearTimeout(timeout)
  document.body.classList.remove('pb-body-preview')
  window.removeEventListener('wheel', onWheel)
  window.removeEventListener('message', onMessage)
})
</script>
