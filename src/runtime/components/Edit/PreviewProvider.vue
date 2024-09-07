<template>
  <slot :mutated-entity="mutatedEntity" />
</template>

<script lang="ts" setup generic="T">
import {
  ref,
  reactive,
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
  ItemEditContext,
} from '#blokkli/types'
import '#blokkli/styles'
import getAdapter from '#blokkli/compiled-edit-adapter'
import {
  INJECT_EDIT_CONTEXT,
  INJECT_IS_PREVIEW,
  INJECT_MUTATED_FIELDS_MAP,
} from '#blokkli/helpers/symbols'
import { frameEventBus } from '#blokkli/helpers/frameEventBus'
import broadcastProvider from '#blokkli/helpers/broadcastProvider'
import { getFieldKey, intersects } from '#blokkli/helpers'
import type { AdapterContext } from '../../adapter'
import { eventBus } from '#blokkli/helpers/eventBus'

const props = defineProps<{
  entity?: T
  entityType: string
  entityUuid: string
  entityBundle: string
  language: string
}>()

const context = computed<AdapterContext>(() => {
  return {
    entityType: props.entityType,
    entityBundle: props.entityBundle,
    entityUuid: props.entityUuid,
    language: props.language,
  }
})
const adapter = await getAdapter(context)
const router = useRouter()
const broadcast = broadcastProvider()

let timeout: any = null
let lastChanged: number = 0
const mutatedFieldsMap = reactive<Record<string, MutatedField | undefined>>({})
const mutatedOptions = reactive<MutatedOptions>({})
const mutatedEntityFromState = ref<T | null>(null)

const mutatedEntity = computed(
  () => mutatedEntityFromState.value || props.entity,
)

const { data, refresh } = await useAsyncData(() =>
  adapter.loadState().then((v) => adapter.mapState(v)),
)

function updateMutatedFields(fields: MutatedField[]) {
  fields.forEach((field) => {
    const key = getFieldKey(field.entityUuid, field.name)
    mutatedFieldsMap[key] = field
  })
}

const updateState = () => {
  const fields = data.value?.mutatedState?.fields || []
  updateMutatedFields(fields)
  mutatedEntityFromState.value = data.value?.mutatedEntity

  const options = (mutatedOptions.value =
    data.value?.mutatedState?.mutatedOptions || {})
  const optionKeys = Object.keys(options)

  for (let i = 0; i < optionKeys.length; i++) {
    const key = optionKeys[i]
    const newOptions = options[key]
    const existing = mutatedOptions[key]
    if (!existing || JSON.stringify(existing) !== JSON.stringify(newOptions)) {
      mutatedOptions[key] = newOptions
    }
  }
}

updateState()

provide(INJECT_MUTATED_FIELDS_MAP, mutatedFieldsMap)
provide(INJECT_IS_PREVIEW, true)
provide<ItemEditContext>(INJECT_EDIT_CONTEXT, {
  mutatedOptions,
  eventBus,
})

/**
 * Listen to window messages and emit the matching frameEventBus event.
 */
function onMessage(e: MessageEvent) {
  if (
    e.data &&
    typeof e.data === 'object' &&
    e.data.name &&
    typeof e.data.name === 'string' &&
    e.data.name.startsWith('blokkli__')
  ) {
    const name = e.data.name.replace('blokkli__', '')
    const data = e.data.data
    frameEventBus.emit(name, data)
  }
}

const onMouseDown = () => {
  broadcast.emit('previewFocused')
}

/**
 * Check the last changed date and update the mutated state if there is an
 * update.
 */
function checkChangedDate() {
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

const onFocusItem = (uuid: string) => {
  const el = document.querySelector(`[data-uuid="${uuid}"]`)
  if (el) {
    const elRect = el.getBoundingClientRect()
    if (
      !intersects(elRect, {
        x: 0,
        y: 0,
        width: window.innerWidth,
        height: window.innerHeight,
      })
    ) {
      el.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center',
      })
    }
  }
}
const onUpdateOption = (option: UpdateBlockOptionEvent) => {
  const { uuid, key, value } = option

  if (!mutatedOptions.value[uuid]) {
    mutatedOptions[uuid] = {}
  }
  if (!mutatedOptions.value[uuid]) {
    mutatedOptions[uuid] = {}
  }
  mutatedOptions[uuid][key] = value
}

onMounted(() => {
  if (isInIframe()) {
    frameEventBus.on('mutatedFields', updateMutatedFields)
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
  frameEventBus.off('mutatedFields', updateMutatedFields)
  frameEventBus.off('focus', onFocusItem)
  frameEventBus.off('updateOption', onUpdateOption)
})
</script>
