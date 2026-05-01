<template>
  <PanelSection :title="$t('chartsNumberFormat', 'Number format')">
    <div class="p-15 grid gap-15">
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
          :label="$t('chartsNumberFormatPrefix', 'Prefix')"
          :placeholder="prefixPlaceholder"
          :model-value="format.prefix ?? ''"
          @update:model-value="update('prefix', $event ? $event : undefined)"
        />
        <FormText
          id="chart-number-suffix"
          :label="$t('chartsNumberFormatSuffix', 'Suffix')"
          :placeholder="suffixPlaceholder"
          :model-value="format.suffix ?? ''"
          @update:model-value="update('suffix', $event ? $event : undefined)"
        />
      </div>

      <div
        class="bg-mono-100 border border-mono-300 rounded p-10 text-sm font-mono text-mono-700 flex items-center justify-between gap-10"
      >
        <span class="text-xs uppercase tracking-wider text-mono-500">
          {{ $t('chartsNumberFormatPreview', 'Preview') }}
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

const localeOptions = computed(() => [
  { value: '', label: $t('chartsNumberFormatLocaleAuto', 'Auto (browser)') },
  { value: 'de-CH', label: 'Deutsch (Schweiz) — 1’234.50' },
  { value: 'fr-CH', label: 'Français (Suisse) — 1 234,50' },
  { value: 'it-CH', label: 'Italiano (Svizzera) — 1’234,50' },
  { value: 'de-DE', label: 'Deutsch (Deutschland) — 1.234,50' },
  { value: 'en-US', label: 'English (US) — 1,234.50' },
  { value: 'en-GB', label: 'English (UK) — 1,234.50' },
  { value: 'fr-FR', label: 'Français (France) — 1 234,50' },
])

const decimalsOptions = computed(() => [
  { value: '', label: $t('chartsNumberFormatDecimalsAuto', 'Auto') },
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
