<template>
  <div class="bk bk-transform-overlay" @keydown.stop @keyup.stop>
    <div ref="el" class="bk-transform-overlay-dialog" @wheel="onWheel">
      <div class="bk-transform-overlay-dialog-inner">
        <div class="bk-transform-overlay-dialog-inner-content">
          <header>
            <p>{{ title }}</p>
            <button @click.prevent="$emit('cancel')">
              <Icon name="close" />
            </button>
          </header>
          <main>
            <div class="bk-transform-overlay-dialog-grid">
              <div class="bk-transform-overlay-dialog-top">
                <p v-if="lead" class="bk-lead">{{ lead }}</p>
                <ConfigForm ref="configForm" v-model="value" :config />
              </div>
              <DiffViewerState
                v-if="stateAfter"
                :state-before
                :state-after
                show-select
                :selected="selection.uuids.value"
                :include-uuids="uuids"
                scheme="orange"
                @toggle="onToggleSelected"
              />
            </div>
            <Loading v-if="isLocked" white />
          </main>
          <footer>
            <button
              v-if="supportsPreview"
              class="bk-button"
              :disabled="disabled || (!hasChanged && !hasSeedInput)"
              :class="{
                'bk-is-loading': isPreviewing,
              }"
              @click.prevent="onClickPreview"
            >
              {{ previewButtonLabel }}
            </button>
            <button
              class="bk-button bk-is-orange"
              :disabled
              @click.prevent="onClickSubmit"
            >
              {{ $t('transformDialogButtonApply', 'Apply changes') }}
            </button>
          </footer>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type {
  HostTransformPlugin,
  MappedState,
  PluginConfigInputItem,
  TransformPlugin,
} from '#blokkli/types'
import {
  useBlokkli,
  ref,
  watch,
  computed,
  useTemplateRef,
  onMounted,
  onBeforeUnmount,
} from '#imports'
import { ConfigForm, DiffViewerState, Icon, Loading } from '#blokkli/components'

const props = defineProps<{
  plugin: HostTransformPlugin | TransformPlugin
  uuids?: string[]
}>()

const { adapter, state, ui, selection, $t, eventBus } = useBlokkli()

function onToggleSelected(uuid: string) {
  let newSelection = [...selection.uuids.value]
  if (newSelection.includes(uuid)) {
    newSelection = newSelection.filter((v) => v !== uuid)
  } else {
    newSelection.push(uuid)
  }

  eventBus.emit('select:force', newSelection)
}

const configForm = useTemplateRef('configForm')

function clone<T extends object>(v: T): T {
  return JSON.parse(JSON.stringify(v))
}

function mapValues(values: Record<string, any>): PluginConfigInputItem[] {
  return Object.entries(values).map(([name, value]) => {
    return {
      name,
      value,
    }
  })
}

const hasSeedInput = computed<boolean>(
  () => !!props.plugin.configInputs?.find((v) => v.type === 'seed'),
)

const previewButtonLabel = computed(() => {
  if (hasSeedInput.value) {
    return $t('transformDialogButtonNewSuggestion', 'New suggestion')
  }
  return $t('transformDialogButtonPreview', 'Preview')
})

const isLocked = ref(false)
const hasChanged = ref(false)
const isPreviewing = ref(false)
const title = computed(() => props.plugin.label)
const lead = computed(() => props.plugin.description)
const config = computed(() => props.plugin.configInputs ?? [])
const isHostPlugin = computed(() => !('bundles' in props.plugin))
const supportsPreview = computed<boolean>(() => {
  if (!props.plugin.preview) {
    return false
  }

  if (isHostPlugin.value) {
    return !!adapter.previewHostTransformPlugin
  }

  return !!adapter.previewTransformPlugin
})

const stateBefore = clone(state.getMappedState())
const stateAfter = ref<MappedState | null>(null)

const emit = defineEmits<{
  (e: 'cancel'): void
  (e: 'submit', values: PluginConfigInputItem[]): void
}>()

const value = ref<Record<string, any>>(
  (props.plugin.configInputs ?? []).reduce<Record<string, string>>(
    (acc, plugin) => {
      acc[plugin.name] = ''
      return acc
    },
    {},
  ),
)

const requiredItems = computed<string[]>(() =>
  config.value.filter((v) => v.required).map((v) => v.name),
)

const canSubmit = computed<boolean>(() => {
  return requiredItems.value.every((name) => !!value.value[name])
})

const disabled = computed(() => isLocked.value || !canSubmit.value)

watch(
  value,
  () => {
    hasChanged.value = true
  },
  {
    deep: true,
  },
)

function onWheel(e: WheelEvent) {
  if (e.metaKey || e.ctrlKey) {
    return
  }

  e.stopPropagation()
}

async function onClickPreview() {
  if (isLocked.value) {
    return
  }

  if (configForm.value) {
    configForm.value.updateSeed()
  }

  isLocked.value = true
  isPreviewing.value = true
  ui.setTransform(title.value)

  if (
    supportsPreview.value &&
    adapter.previewTransformPlugin &&
    'bundles' in props.plugin &&
    props.uuids
  ) {
    const config = mapValues(value.value)
    try {
      const result = await adapter.previewTransformPlugin({
        pluginId: props.plugin.id,
        uuids: props.uuids,
        config,
      })

      stateAfter.value = clone(adapter.mapState(result.state))
      state.setOverrideState(stateAfter.value)
    } catch {
      // @TODO Error message
    }
  }

  isLocked.value = false
  isPreviewing.value = false
  ui.setTransform()
  hasChanged.value = false
}

function onClickSubmit() {
  if (isLocked.value) {
    return
  }

  isLocked.value = true
  emit('submit', mapValues(value.value))
}

onMounted(async () => {
  ui.hasTransformOverlayOpen.value = true
  selection.lockSelection('transform-dialog')

  // Trigger the preview if the transform plugin supports previewing
  // and if it doesn't have any required user input or only a seed input.
  if (hasSeedInput.value && supportsPreview.value) {
    const hasNoRequiredInput = props.plugin.configInputs?.every(
      (v) => v.type === 'seed' || !v.required,
    )
    if (hasNoRequiredInput === true) {
      await onClickPreview()
    }
  }
})

onBeforeUnmount(() => {
  ui.hasTransformOverlayOpen.value = false
  selection.unlockSelection('transform-dialog')
})
</script>
