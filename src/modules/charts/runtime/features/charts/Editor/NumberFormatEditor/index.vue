<template>
  <PanelSection :title="$t('chartsNumberFormat', 'Number format')">
    <div class="p-panel-gap grid gap-15">
      <slot />
      <FormSelect
        id="chart-number-locale"
        :label="$t('chartsNumberFormatLocale', 'Locale')"
        :options="localeOptions"
        :model-value="format.locale ?? ''"
        @update:model-value="update('locale', $event ? $event : undefined)"
      />

      <FormSelect
        id="chart-number-decimals"
        :label="$t('chartsNumberFormatDecimals', 'Decimals')"
        :options="decimalsOptions"
        :model-value="
          format.decimals === undefined ? '' : String(format.decimals)
        "
        @update:model-value="
          update('decimals', $event === '' ? undefined : Number($event))
        "
      />

      <FormRadio
        id="chart-number-notation"
        :label="$t('chartsNumberFormatNotation', 'Notation')"
        inline
        :options="notationOptions"
        :model-value="format.notation ?? 'standard'"
        @update:model-value="
          update('notation', $event === 'compact' ? 'compact' : undefined)
        "
      />

      <div class="grid grid-cols-2 gap-15">
        <FormText
          id="chart-number-prefix"
          :label="$t('prefix', 'Prefix')"
          :placeholder="prefixPlaceholder"
          :model-value="format.prefix ?? ''"
          lazy
          @update:model-value="update('prefix', $event ? $event : undefined)"
        />
        <FormText
          id="chart-number-suffix"
          :label="$t('suffix', 'Suffix')"
          :placeholder="suffixPlaceholder"
          :model-value="format.suffix ?? ''"
          lazy
          @update:model-value="update('suffix', $event ? $event : undefined)"
        />
      </div>

      <div
        class="bg-mono-100 border border-mono-300 p-10 text-sm font-mono text-mono-700 flex items-center justify-between gap-10"
      >
        <span class="bk-form-label mb-0!">
          {{ $t('preview', 'Preview') }}
        </span>
        <span>{{ preview }}</span>
      </div>
    </div>
  </PanelSection>
</template>

<script setup lang="ts">
import { computed, useBlokkli } from '#imports'
import type { ChartNumberFormat } from '../../../../types'
import { createNumberFormatter } from '../../../../helpers/numberFormat'
import { FormSelect, FormText, FormRadio } from '#blokkli/editor/components'
import PanelSection from '#blokkli/editor/components/Panel/Section/index.vue'
import { chartsConfig } from '#blokkli-build/charts-config'

const { $t } = useBlokkli()

const props = defineProps<{
  format: ChartNumberFormat
}>()

const emit = defineEmits<{
  'update:format': [value: ChartNumberFormat]
}>()

function update<K extends keyof ChartNumberFormat>(
  key: K,
  value: ChartNumberFormat[K] | undefined,
) {
  const next: ChartNumberFormat = { ...props.format }
  if (value === undefined || value === '') {
    next[key] = undefined
  } else {
    next[key] = value
  }
  emit('update:format', next)
}

/**
 * Build the label for a locale entirely from its id: the language and region
 * name are rendered in the locale itself (autonym), followed by an example of
 * how a number is formatted. Falls back to the raw id if `Intl` can't resolve
 * the locale.
 */
function deriveLocaleLabel(id: string): string {
  let name = id
  try {
    name =
      new Intl.DisplayNames([id], {
        type: 'language',
        languageDisplay: 'standard',
      }).of(id) ?? id
  } catch {
    // Keep the raw id.
  }

  try {
    const example = new Intl.NumberFormat(id, {
      minimumFractionDigits: 2,
    }).format(1234.5)
    return `${name} — ${example}`
  } catch {
    return name
  }
}

const localeOptions = computed(() => [
  { value: '', label: $t('chartsNumberFormatLocaleAuto', 'Auto (browser)') },
  ...chartsConfig.numberFormatLocales.map((id) => ({
    value: id,
    label: deriveLocaleLabel(id),
  })),
])

const decimalsOptions = computed(() => [
  { value: '', label: $t('auto', 'Auto') },
  { value: '0', label: '0' },
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
])

const notationOptions = computed(() => [
  {
    value: 'standard',
    label: $t('chartsNumberFormatNotationStandard', 'Standard'),
  },
  {
    value: 'compact',
    label: $t('chartsNumberFormatNotationCompact', 'Compact (1.2M)'),
  },
])

const prefixPlaceholder = 'CHF '
const suffixPlaceholder = ' kg'

const preview = computed(() => {
  const fmt = createNumberFormatter(props.format)
  return fmt(12345.6789)
})
</script>
