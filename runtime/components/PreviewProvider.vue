<template>
  <slot></slot>
</template>

<script lang="ts" setup>
import { MutatedParagraphOptions, PbMutatedField } from '#pb/types'
import '#nuxt-paragraphs-builder/styles'
import getAdapter from '#blokkli/compiled-edit-adapter'

const props = defineProps<{
  entityType: string
  entityUuid: string
}>()

const adapter = getAdapter(props)

const router = useRouter()

let timeout: any = null
let lastChanged: number = 0
const mutatedFields = ref<PbMutatedField[]>([])
const mutatedParagraphOptions = ref<MutatedParagraphOptions>({})

const { data, refresh } = await useAsyncData(() =>
  adapter.loadState().then((v) => adapter.mapState(v)),
)

const updateState = () => {
  mutatedParagraphOptions.value =
    data.value?.mutatedState?.behaviorSettings || {}
  mutatedFields.value = data.value?.mutatedState?.fields || []
}

updateState()

provide('paragraphsBuilderMutatedFields', mutatedFields)
provide('paragraphsBuilderPreview', true)
provide('paragraphsBuilderEditContext', {
  mutatedParagraphOptions,
})

function onMessage(e: MessageEvent) {
  if (e.data && typeof e.data === 'object') {
    if (e.data.name === 'paragraphsBuilderMutatedFields') {
      mutatedFields.value = [...e.data.data]
    } else if (e.data.name === 'paragraphsBuilderFocus') {
      const uuid = e.data.data
      const el = document.querySelector(`[data-uuid="${uuid}"]`)
      if (el) {
        let position = el.getBoundingClientRect()
        window.scrollTo({
          left: position.left,
          top: position.top + window.scrollY - 200,
          behavior: 'smooth',
        })
      }
    }
    if (e.data.name === 'paragraphsBuilderUpdateOption') {
      const { uuid, key, value } = e.data.data

      if (!mutatedParagraphOptions.value[uuid]) {
        mutatedParagraphOptions.value[uuid] = {}
      }
      if (!mutatedParagraphOptions.value[uuid].paragraph_builder_data) {
        mutatedParagraphOptions.value[uuid].paragraph_builder_data = {}
      }
      mutatedParagraphOptions.value[uuid].paragraph_builder_data[key] = value
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
    const changed = await adapter.getLastChanged()
    if (changed) {
      if (lastChanged !== 0 && lastChanged !== changed) {
        await refresh()
        updateState()
      }
      lastChanged = changed
      checkChangedDate()
    }
  }, 1000)
}

const onWheel = (e: WheelEvent) => {
  if (e.ctrlKey) {
    e.preventDefault()
  }
}

const isInIframe = () => window.parent !== window

onMounted(() => {
  if (isInIframe()) {
    // We are a preview inside the iframe of the main editing app.
    // In this case updated state is passed in via postMessage from the main
    // editing app. Also native scrolling is disabled and we handle it
    // ourselves.
    document.body.classList.add('pb-body-preview')
    document.documentElement.classList.add('pb-html-preview')
    window.addEventListener('message', onMessage)
    window.addEventListener('wheel', onWheel, { passive: false })

    // Prevent navigating away from the preview when clicking Nuxt links.
    router.push = () => Promise.resolve()
    router.replace = () => Promise.resolve()
  } else {
    // We are a standalone page in preview mode. Setup polling for changes.
    checkChangedDate()
  }
})

onBeforeUnmount(() => {
  clearTimeout(timeout)
  document.body.classList.remove('pb-body-preview')
  document.documentElement.classList.remove('pb-html-preview')
  window.removeEventListener('wheel', onWheel)
  window.removeEventListener('message', onMessage)
})
</script>
