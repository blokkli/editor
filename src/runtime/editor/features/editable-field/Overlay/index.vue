<template>
  <ArtboardTooltip
    v-if="loaded"
    id="editable"
    :title
    :anchor-el="element"
    placement-y="top"
    :placement-x="useHorizontalPlacement ? 'auto-side' : 'center'"
    class="bk-editable-field"
    :class="{ 'bk-is-fullscreen': isFullscreen }"
    close-icon="bk_mdi_check"
    :fullscreen="isFullscreen"
    :button-label="$t('save', 'Save')"
    @close="save"
  >
    <template #header>
      <button
        v-if="canDoFullscreen"
        type="button"
        @click="isFullscreenPreference = !isFullscreenPreference"
      >
        <Icon
          :name="isFullscreen ? 'bk_mdi_fullscreen_exit' : 'bk_mdi_fullscreen'"
        />
        <span>{{
          isFullscreen
            ? $t('editableFieldExitFullscreen', 'Exit Fullscreen')
            : $t('editableFieldFullscreen', 'Fullscreen')
        }}</span>
      </button>
    </template>
    <form
      ref="form"
      class="bk-editable-field-input"
      data-test="editable-overlay"
      :data-test-type="config.type"
      @submit.prevent="save"
    >
      <div ref="input">
        <InputContenteditable
          v-if="config.type === 'markup'"
          v-model="modelValue"
          :type="config.type"
          @close="save"
        />

        <InputFrame
          v-else-if="config.type === 'frame'"
          ref="inputFrame"
          v-model="modelValue"
          :type="config.type"
          :field-name="fieldName"
          :host="host"
          :initial-height="scrollHeight"
          :is-fullscreen
          @formatted="onFormattedValue"
        />

        <InputPlaintext
          v-else
          v-model="modelValue"
          :element="element"
          :required="required"
          :maxlength="maxlength"
          @discard="discard"
          @save="save"
        />
      </div>

      <div class="bk-artboard-tooltip-info">
        <button
          :disabled="!hasChanged"
          class="bk-artboard-tooltip-info-button bk-scheme-red"
          data-test="editable-discard"
          @click.prevent="discard"
        >
          {{ $t('editableFieldDiscard', 'Discard') }}
        </button>
        <button
          v-if="canTranslate"
          :disabled="isAutoTranslating"
          class="bk-artboard-tooltip-info-button bk-scheme-mono relative group/tooltip"
          @click.prevent="autoTranslate"
        >
          <Icon name="bk_mdi_translate" class="size-15" />
          {{ $t('translate', 'Translate') }}
          <Tooltip
            :label="
              $t(
                'editableFieldTranslateTooltip',
                'Automatically translate the current text.',
              )
            "
          />
        </button>
        <div v-if="errorText" class="bk-editable-field-info-error">
          {{ errorText }}
        </div>
        <div
          v-else-if="config.type === 'plain'"
          class="bk-editable-field-info-hint"
        >
          {{ $t('textareaNewLineHint', 'Shift + Enter for new line') }}
        </div>
        <ReadabilityIndicator
          v-if="isReadabilityField"
          :text="modelValue"
          :field-type="readabilityFieldType"
        />
        <div
          v-if="!isMarkup"
          class="bk-editable-field-info-count relative group/tooltip"
          data-test="editable-char-count"
          :data-test-count="count"
        >
          <span>{{ count }}</span>
          <span v-if="maxlength >= 1">&nbsp;/&nbsp;{{ maxlength }}</span>
          <Tooltip
            v-if="maxlength >= 1"
            :label="
              $t('editableFieldCharCountMax', '@count of @max characters used')
                .replace('@count', count.toString())
                .replace('@max', maxlength.toString())
            "
          />
        </div>
      </div>
    </form>
    <ChunkOverlay
      v-if="isReadabilityField && isMarkup"
      :text="modelValue"
      :field-type="readabilityFieldType"
      :element="element"
    />
  </ArtboardTooltip>
</template>

<script lang="ts" setup>
import type { EntityContext } from '#blokkli/types'
import { ArtboardTooltip, Icon, Tooltip } from '#blokkli/editor/components'
import {
  computed,
  ref,
  watch,
  onMounted,
  onBeforeUnmount,
  useBlokkli,
  nextTick,
  useTemplateRef,
} from '#imports'
import { falsy } from '#blokkli/helpers'
import InputPlaintext from './Plaintext/index.vue'
import InputContenteditable from './Contenteditable/index.vue'
import InputFrame from './Frame/index.vue'
import { itemEntityType } from '#blokkli-build/config'
import {
  onBlokkliEvent,
  useEditableFieldOverride,
} from '#blokkli/editor/composables'
import type { EditableFieldConfig } from '../types'
import ReadabilityIndicator from './ReadabilityIndicator/index.vue'
import ChunkOverlay from './ReadabilityIndicator/ChunkOverlay.vue'

const {
  state,
  adapter,
  $t,
  types,
  context,
  fieldValue,
  element: elementProvider,
  storage,
  readability,
} = useBlokkli()

const props = defineProps<{
  fieldName: string
  host: EntityContext
  element: HTMLElement
  config: EditableFieldConfig
  isComponent?: boolean
  value?: string
}>()

const emit = defineEmits(['close'])

// Refs
const scrollHeight = ref(0)
const loaded = ref(false)
const originalText = ref('')
const modelValue = ref('')
const form = useTemplateRef('form')
const inputFrame = useTemplateRef('inputFrame')
const isClosing = ref(false)
const isAutoTranslating = ref(false)
const isFullscreenPreference = storage.use('editableOverlayFullscreen', false)

const canDoFullscreen = computed(
  () => props.config.type === 'markup' || props.config.type === 'frame',
)

const isFullscreen = computed(
  () => canDoFullscreen.value && isFullscreenPreference.value,
)

// For frame fields: the backend-processed HTML used for live preview.
// When set, the preview uses this instead of the raw modelValue.
const formattedValue = ref<string | null>(null)

// Create field override for live preview via the correct update strategy.
const override = useEditableFieldOverride(props.fieldName, props.host)

// Computed properties
const hasChanged = computed(
  () => modelValue.value.trim() !== originalText.value.trim(),
)
const itemBundle = computed(() => props.host.bundle)
const maxlength = computed(() => props.config.maxLength)
const required = computed(() => !!props.config.required)
const title = computed(() => {
  if (itemBundle.value) {
    return [
      types.getBlockBundleDefinition(itemBundle.value)?.label,
      props.config.label,
    ]
      .filter(falsy)
      .join(' » ')
  }

  return props.config.label
})
const useHorizontalPlacement = computed(
  () => props.config.type === 'frame' && scrollHeight.value > 300,
)

const isMarkup = computed(
  () =>
    props.config.type === 'table' ||
    props.config.type === 'markup' ||
    props.config.type === 'frame',
)

const count = computed(() => modelValue.value.length)

const errorText = computed(() => {
  if (required.value && !modelValue.value) {
    return $t('fieldIsRequired', 'This field is required')
  }

  return undefined
})

const isReadabilityField = computed(
  () =>
    readability.isAvailable.value &&
    (props.config.type === 'plain' ||
      props.config.type === 'markup' ||
      props.config.type === 'frame'),
)

const readabilityFieldType = computed<'plain' | 'markup'>(() =>
  props.config.type === 'frame' || props.config.type === 'markup'
    ? 'markup'
    : 'plain',
)

function onFormattedValue(text: string) {
  formattedValue.value = text
}

const canTranslate = computed(
  () => state.editMode.value === 'translating' && !!adapter.requestTranslation,
)

async function autoTranslate() {
  if (isAutoTranslating.value) return
  isAutoTranslating.value = true

  try {
    const sourceLanguage = state.translation.value.sourceLanguage || 'en'
    const targetLanguage = context.value.language
    const key = `${props.host.uuid}:${props.fieldName}`

    const response = await adapter.requestTranslation!([
      {
        key,
        text: modelValue.value,
        isHtml: readabilityFieldType.value === 'markup',
        sourceLanguage,
        targetLanguage,
      },
    ])

    if (response.success && response.data.length) {
      const translatedText = response.data[0]!.translatedText
      modelValue.value = translatedText
      // For frame fields, push the value into the iframe's editor.
      inputFrame.value?.setValue(translatedText)
    }
  } finally {
    isAutoTranslating.value = false
  }
}

/**
 * Restore the original state when discarding changes.
 */
function restoreOriginalState() {
  override.restore()
}

/**
 * Persist the changed value via the adapter.
 */
async function persistValue() {
  if (props.host.type === itemEntityType) {
    await state.mutateWithLoadingState(() =>
      adapter.updateFieldValue!({
        uuid: props.host.uuid,
        fieldName: props.fieldName,
        fieldValue: modelValue.value,
      }),
    )
  } else if (adapter.updateEntityFieldValue) {
    await state.mutateWithLoadingState(() =>
      adapter.updateEntityFieldValue!({
        fieldName: props.fieldName,
        fieldValue: modelValue.value,
      }),
    )
  }
}

/**
 * Discard changes and restore original state.
 */
function discard() {
  if (isClosing.value) {
    return
  }
  isClosing.value = true

  if (hasChanged.value) {
    restoreOriginalState()
  }
  emit('close')
}

/**
 * Save changes if valid, otherwise restore original state.
 */
async function save() {
  if (isClosing.value) {
    return
  }
  isClosing.value = true

  if (hasChanged.value) {
    if (errorText.value) {
      // Validation error: restore original state instead of saving.
      restoreOriginalState()
    } else {
      await persistValue()
    }
  }
  emit('close')
}

// Save the editable when clicking away from the text area.
onBlokkliEvent('window:clickAway', save)

// Update the live preview as the user types.
// Frame fields use the backend-formatted value; other fields use modelValue directly.
watch(
  () =>
    props.config.type === 'frame' ? formattedValue.value : modelValue.value,
  (newText) => {
    if (newText !== null) {
      override.setValue(newText)
    }
  },
)

const focusInput = (el?: HTMLElement | Document | null) => {
  if (!el) {
    return
  }

  const queryEl = el instanceof Document ? el.documentElement : el

  const textarea = elementProvider.query<HTMLTextAreaElement>(
    queryEl,
    'textarea',
    'Focus editable field textarea',
  )
  if (textarea) {
    textarea.focus()
    return
  }

  const editable = elementProvider.query<HTMLElement>(
    queryEl,
    '[contenteditable]',
    'Focus editable field contenteditable',
  )
  if (editable) {
    editable.focus()
    return
  }

  const iframe = elementProvider.query<HTMLIFrameElement>(
    queryEl,
    'iframe',
    'Find iframe in editable field',
  )

  if (iframe?.contentDocument) {
    focusInput(iframe.contentDocument)
  }
}

onMounted(() => {
  const el = props.element

  // Read the raw value from textFieldValues when available (always has
  // unprocessed values), fall back to the override's captured DOM value.
  if (props.isComponent) {
    modelValue.value = props.value || ''
  } else {
    const tfv = fieldValue
      .getTextFieldValues()
      .find(
        (v) => v.uuid === props.host.uuid && v.fieldName === props.fieldName,
      )
    modelValue.value =
      tfv?.value ||
      override.originalValue ||
      (isMarkup.value ? props.element.innerHTML : props.element.textContent) ||
      ''
  }

  originalText.value = modelValue.value

  nextTick(() => {
    scrollHeight.value = el.scrollHeight
    loaded.value = true
    nextTick(() => {
      focusInput(form.value)
    })
  })
})

onBeforeUnmount(async () => {
  // If save() or discard() already ran, skip - they handled everything.
  if (isClosing.value) {
    return
  }

  // We're being unmounted due to key change (user opened another editable).
  // Default to save behavior.
  if (hasChanged.value && !errorText.value) {
    await persistValue()
  }
})
</script>

<style lang="postcss">
.bk.bk-editable-field {
  --bk-bg: white;
  --bk-header-bg: theme('colors.teal.normal');
  --bk-header-text: theme('colors.teal.dark');
  --bk-border: theme('colors.teal.normal');
  --bk-header-hover: rgb(var(--bk-theme-teal-dark) / 0.2);

  &.bk-is-fullscreen .bk-editable-field-input {
    @apply max-w-none flex-1 flex flex-col;

    > div:first-child {
      @apply flex-1 flex flex-col;

      > * {
        @apply flex-1;
      }
    }
  }

  .bk-editable-field-input {
    @apply w-full min-w-[360px] max-w-[700px];
    @variant md {
      @apply rounded;
    }

    .bk-editable-field-textarea {
      @apply relative;
      @variant lg {
        @apply min-w-[600px];
      }
    }

    textarea {
      @apply appearance-none resize-none block p-10;
      @apply outline-none shadow-none border-none;
      @apply focus:!outline-none focus:!shadow-none focus:!border-none focus:!ring-0 bg-transparent;
      @apply min-h-[50px] w-full;
      @apply text-base lg:text-lg;
      @apply absolute top-0 left-0 h-full;
    }
  }
  .bk-editable-field-translate {
    @apply flex items-center gap-3 px-10 text-teal-dark border-r border-r-mono-300;

    &:disabled {
      @apply opacity-50;
    }
  }
  .bk-editable-field-info-error {
    @apply text-red-normal px-10 ml-auto;
  }
  .bk-editable-field-info-hint {
    @apply px-10 font-normal text-right ml-auto text-mono-500 text-xs;
  }
  .bk-editable-field-readability {
    @apply relative px-10 h-[32px] flex items-center gap-5 border-l border-l-mono-300 text-xs text-mono-600 transition-opacity duration-200 cursor-default;
    @apply cursor-help;

    &.bk-is-stale {
      @apply opacity-40;
    }
  }
  .bk-readability-scale {
    @apply mt-15 w-full pb-25;
  }
  .bk-readability-scale-labels {
    @apply relative h-[16px] text-xs text-mono-50 font-semibold;

    > span {
      @apply absolute -translate-x-1/2 -top-5;
    }
  }
  .bk-readability-scale-bar {
    @apply relative h-[12px];
  }
  .bk-readability-scale-segments {
    @apply absolute inset-0 rounded-full overflow-hidden;
  }
  .bk-readability-scale-segment {
    @apply absolute top-0 h-full;

    &.bk-is-left {
      @apply left-0;
    }

    &.bk-is-middle {
      @apply bg-yellow-normal;
    }
  }
  /* higher_easier (e.g. FRE): low=hard, high=easy */
  .bk-readability-scale.bk-is-higher_easier {
    .bk-is-left {
      @apply bg-red-normal;
    }
    .bk-is-right {
      @apply bg-lime-normal;
    }
  }
  /* higher_harder (e.g. LIX): low=easy, high=hard */
  .bk-readability-scale.bk-is-higher_harder {
    .bk-is-left {
      @apply bg-lime-normal;
    }
    .bk-is-right {
      @apply bg-red-normal;
    }
  }
  .bk-readability-scale-marker {
    @apply absolute -top-5 w-[3px] bg-white rounded-full -translate-x-1/2 -bottom-5;
    box-shadow: 0 0 0 1px rgb(0 0 0 / 0.3);

    > span {
      @apply absolute top-full left-1/2 -translate-x-1/2 text-white font-bold whitespace-nowrap text-sm mt-5;
    }
  }
  .bk-editable-field-readability-dot {
    @apply w-8 h-8 rounded-full flex-shrink-0 bg-mono-300;

    &.bk-is-easy {
      @apply bg-lime-normal;
    }
    &.bk-is-ok {
      @apply bg-yellow-normal;
    }
    &.bk-is-hard {
      @apply bg-red-normal;
    }
  }
  .bk-editable-field-info-count {
    @apply px-10 h-[32px] flex items-center border-l border-l-mono-300;
  }
}
</style>
