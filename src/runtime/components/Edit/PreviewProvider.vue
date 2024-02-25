<template>
  <slot :mutated-entity="mutatedEntity" />
</template>

<script lang="ts" setup generic="T">
import {
  ref,
  computed,
  provide,
  onMounted,
  onBeforeUnmount,
  useRouter,
  useAsyncData,
} from '#imports'
import type {
  MutatedOptions,
  MutatedField,
  UpdateBlockOptionEvent,
} from '#blokkli/types'
import '#blokkli/styles'
import getAdapter from '#blokkli/compiled-edit-adapter'
import {
  INJECT_EDIT_CONTEXT,
  INJECT_IS_PREVIEW,
  INJECT_MUTATED_FIELDS,
} from '#blokkli/helpers/symbols'
import { frameEventBus } from '#blokkli/helpers/frameEventBus'
import broadcastProvider from '#blokkli/helpers/broadcastProvider'

const props = defineProps<{
  entity?: T
  entityType: string
  entityUuid: string
  entityBundle: string
  language: string
}>()

const context = computed(() => props)
const adapter = getAdapter(context)
const router = useRouter()
const broadcast = broadcastProvider()

let timeout: any = null
let lastChanged: number = 0
const mutatedFields = ref<MutatedField[]>([])
const mutatedOptions = ref<MutatedOptions>({})
const mutatedEntityFromState = ref<T | null>(null)

const mutatedEntity = computed(
  () => mutatedEntityFromState.value || props.entity,
)

const { data, refresh } = await useAsyncData(() =>
  adapter.loadState().then((v) => adapter.mapState(v)),
)

const updateState = () => {
  mutatedOptions.value = data.value?.mutatedState?.mutatedOptions || {}
  mutatedFields.value = data.value?.mutatedState?.fields || []
  mutatedEntityFromState.value = data.value?.mutatedEntity
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

const onMouseDown = () => {
  broadcast.emit('previewFocused')
}

/**
 * Check the last changed date and update the mutated state if there is an
 * update.
 */
async function checkChangedDate() {
  clearTimeout(timeout)

  const delay = adapter.getLastChanged ? 1000 : 5000

  timeout = setTimeout(async () => {
    const changed = adapter.getLastChanged
      ? await adapter.getLastChanged()
      : Date.now()
    if (changed) {
      if (lastChanged !== 0 && lastChanged !== changed) {
        await refresh()
        updateState()
      }
      lastChanged = changed
      checkChangedDate()
    }
  }, delay)
}

const onWheel = (e: WheelEvent) => {
  if (e.ctrlKey) {
    e.preventDefault()
  }
}

const isInIframe = () => window.parent !== window

const onMutatedFields = (fields: MutatedField[]) => {
  mutatedFields.value = [...fields]
}
const onFocusItem = (uuid: string) => {
  const el = document.querySelector(`[data-uuid="${uuid}"]`)
  if (el) {
    const position = el.getBoundingClientRect()
    window.scrollTo({
      left: position.left,
      top: position.top + window.scrollY - 200,
      behavior: 'smooth',
    })
  }
}
const onUpdateOption = (option: UpdateBlockOptionEvent) => {
  const { uuid, key, value } = option

  if (!mutatedOptions.value[uuid]) {
    mutatedOptions.value[uuid] = {}
  }
  if (!mutatedOptions.value[uuid]) {
    mutatedOptions.value[uuid] = {}
  }
  mutatedOptions.value[uuid][key] = value
}

onMounted(() => {
  if (isInIframe()) {
    frameEventBus.on('mutatedFields', onMutatedFields)
    frameEventBus.on('focus', onFocusItem)
    frameEventBus.on('updateOption', onUpdateOption)
    // We are a preview inside the iframe of the main editing app.
    // In this case updated state is passed in via postMessage from the main
    // editing app.
    document.body.classList.add('bk-body-preview')
    document.documentElement.classList.add('bk-html-preview')
    window.addEventListener('message', onMessage)
    window.addEventListener('wheel', onWheel, { passive: false })
    document.documentElement.addEventListener('mousedown', onMouseDown)

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
  document.documentElement.removeEventListener('mousedown', onMouseDown)
  frameEventBus.off('mutatedFields', onMutatedFields)
  frameEventBus.off('focus', onFocusItem)
  frameEventBus.off('updateOption', onUpdateOption)
})
</script>
