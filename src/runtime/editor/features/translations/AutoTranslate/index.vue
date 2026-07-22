<template>
  <PluginItemAction
    v-if="isTranslating && canAutoTranslate"
    id="auto-translate"
    multiple
    :title="autoTranslateLabel"
    :description="
      $t(
        'translationsAutoTranslateDescription',
        'Automatically translate all texts of this block.',
      )
    "
    icon="bk_mdi_translate"
    :weight="-80"
    @click="onClick"
  >
    <template #icon>
      <Icon
        name="bk_mdi_translate"
        class="size-25 pointer-events-none text-orange-normal"
      />
      <div
        class="text-[9px] font-bold absolute left-1/2 -translate-x-1/2 bottom-[-4px] text-orange-dark bg-orange-normal rounded-full px-3 leading-[11px] border-2 border-mono-900 group-hover/button:border-mono-700"
      >
        AUTO
      </div>
    </template>
  </PluginItemAction>

  <DiffApproval
    v-if="phase === 'approving'"
    :items="approvalItems"
    insertions-only
    editable
    @apply="onApply"
    @cancel="onCancel"
  />
</template>

<script lang="ts" setup>
import { ref, computed, useBlokkli } from '#imports'
import { PluginItemAction } from '#blokkli/editor/plugins'
import { DiffApproval, Icon } from '#blokkli/editor/components'
import type {
  ApprovalItem,
  DiffApplyPayload,
} from '#blokkli/editor/components/DiffApproval/types'
import type { TextFieldValue } from '#blokkli/editor/providers/fieldValue'

const { adapter, $t, state, context, selection, types, ui } = useBlokkli()

const phase = ref<'idle' | 'loading' | 'approving'>('idle')
const approvalItems = ref<ApprovalItem[]>([])

const isTranslating = computed(() => state.editMode.value === 'translating')

const canAutoTranslate = computed(
  () =>
    !!adapter.requestTranslation &&
    !!adapter.loadTextFieldValuesForLanguage &&
    !!adapter.importTranslationsBatched,
)

const autoTranslateLabel = computed(() =>
  $t('translationsAutoTranslate', 'Auto-translate'),
)

function resolveFieldLabel(
  entityType: string,
  bundle: string,
  fieldName: string,
): string {
  const config = types.editableFieldConfig.forName(
    entityType,
    bundle,
    fieldName,
  )
  return config?.label || fieldName
}

async function onClick() {
  if (phase.value !== 'idle') {
    return
  }

  phase.value = 'loading'
  ui.setTransform(autoTranslateLabel.value)

  try {
    const sourceLanguage = state.translation.value.sourceLanguage || 'en'
    const targetLanguage = context.value.language
    const selectedUuids = new Set(selection.uuids.value)

    const sourceValues =
      await adapter.loadTextFieldValuesForLanguage!(sourceLanguage)
    const toTranslate = sourceValues.filter((v) => selectedUuids.has(v.uuid))

    if (!toTranslate.length) {
      return
    }

    const byKey = new Map<string, TextFieldValue>(
      toTranslate.map((v) => [`${v.uuid}:${v.fieldName}`, v]),
    )

    const response = await adapter.requestTranslation!(
      toTranslate.map((v) => ({
        key: `${v.uuid}:${v.fieldName}`,
        text: v.value,
        isHtml: v.fieldType === 'markup',
        sourceLanguage,
        targetLanguage,
      })),
    )

    if (!response.success || !response.data.length) {
      return
    }

    let id = 0
    approvalItems.value = response.data.map((result) => {
      const separatorIndex = result.key.indexOf(':')
      const uuid = result.key.substring(0, separatorIndex)
      const fieldName = result.key.substring(separatorIndex + 1)
      const source = byKey.get(result.key)
      return {
        id: id++,
        uuid,
        fieldName,
        fieldLabel: source
          ? resolveFieldLabel(source.entityType, source.entityBundle, fieldName)
          : fieldName,
        value: result.translatedText,
      }
    })

    phase.value = 'approving'
  } finally {
    ui.setTransform(null)
    if (phase.value === 'loading') {
      phase.value = 'idle'
    }
  }
}

async function onApply(data: DiffApplyPayload) {
  const targetLanguage = context.value.language
  const items = approvalItems.value
    .filter((item) => data.selected[String(item.id)])
    .map((item) => ({
      langcode: targetLanguage,
      uuid: item.uuid,
      fieldName: item.fieldName,
      fieldValue: data.edited[String(item.id)] ?? item.value,
    }))

  if (items.length) {
    await state.mutateWithLoadingState(() =>
      adapter.importTranslationsBatched!({ items }),
    )
  }

  finishApproval()
}

function onCancel() {
  finishApproval()
}

function finishApproval() {
  // Setting the phase to idle unmounts DiffApproval, which restores its own
  // preview overlays on unmount.
  phase.value = 'idle'
  approvalItems.value = []
}

defineOptions({
  name: 'AutoTranslate',
})
</script>
