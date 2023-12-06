<template>
  <slot></slot>
</template>

<script lang="ts" setup>
import {
  MutatedOptions,
  BlokkliMutatedField,
  UpdateBlokkliItemOptionEvent,
} from '#blokkli/types'
import '#blokkli/styles'
import getAdapter from '#blokkli/compiled-edit-adapter'
import {
  INJECT_EDIT_CONTEXT,
  INJECT_IS_PREVIEW,
  INJECT_MUTATED_FIELDS,
} from '#blokkli/helpers/symbols'
import { frameEventBus } from '#blokkli/helpers/frameEventBus'

const props = defineProps<{
  entityType: string
  entityUuid: string
  entityBundle: string
  language?: string
}>()

const context = computed(() => props)
const adapter = getAdapter(context)
const router = useRouter()
const optionsPluginId = useRuntimeConfig().public.blokkli.optionsPluginId

let timeout: any = null
let lastChanged: number = 0
const mutatedFields = ref<BlokkliMutatedField[]>([])
const mutatedOptions = ref<MutatedOptions>({})

const { data, refresh } = await useAsyncData(() =>
  adapter.loadState().then((v) => adapter.mapState(v)),
)

const updateState = () => {
  mutatedOptions.value = data.value?.mutatedState?.behaviorSettings || {}
  mutatedFields.value = data.value?.mutatedState?.fields || []
}

updateState()

provide(INJECT_MUTATED_FIELDS, mutatedFields)
provide(INJECT_IS_PREVIEW, true)
provide(INJECT_EDIT_CONTEXT, {
  mutatedOptions,
})

/**
 * Listen to window messages and emit the matching frameEventBus event.
 */
function onMessage(e: MessageEvent) {
  if (e.data && typeof e.data === 'object') {
    if (
      e.data.name &&
      typeof e.data.name === 'string' &&
      e.data.name.startsWith('blokkli__')
    ) {
      const name = e.data.name.replace('blokkli__', '')
      const data = e.data.data
      frameEventBus.emit(name, data)
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

const onMutatedFields = (fields: BlokkliMutatedField[]) => {
  mutatedFields.value = [...fields]
}
const onFocusItem = (uuid: string) => {
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
const onUpdateOption = (option: UpdateBlokkliItemOptionEvent) => {
  const { uuid, key, value } = option

  if (!mutatedOptions.value[uuid]) {
    mutatedOptions.value[uuid] = {}
  }
  if (!mutatedOptions.value[uuid][optionsPluginId]) {
    mutatedOptions.value[uuid][optionsPluginId] = {}
  }
  mutatedOptions.value[uuid][optionsPluginId][key] = value
}

onMounted(() => {
  if (isInIframe()) {
    frameEventBus.on('mutatedFields', onMutatedFields)
    frameEventBus.on('focus', onFocusItem)
    frameEventBus.on('updateOption', onUpdateOption)
    // We are a preview inside the iframe of the main editing app.
    // In this case updated state is passed in via postMessage from the main
    // editing app. Also native scrolling is disabled and we handle it
    // ourselves.
    document.body.classList.add('bk-body-preview')
    document.documentElement.classList.add('bk-html-preview')
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
  document.body.classList.remove('bk-body-preview')
  document.documentElement.classList.remove('bk-html-preview')
  window.removeEventListener('wheel', onWheel)
  window.removeEventListener('message', onMessage)
  frameEventBus.off('mutatedFields', onMutatedFields)
  frameEventBus.off('focus', onFocusItem)
  frameEventBus.off('updateOption', onUpdateOption)
})
</script>
