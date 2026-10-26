<template>
  <div class="flex flex-col gap-5 p-panel-gap">
    <div class="bk-form-label">
      {{ $t('chartsTranslationsSeries', 'Series') }}
    </div>
    <InfoBox
      v-if="series.length > MAX_OVERRIDE_ROWS"
      small
      :text="
        $t(
          'chartsDynamicOverridesTooMany',
          'Too many items to configure inline (@count, max @max).',
        )
          .replace('@count', String(series.length))
          .replace('@max', String(MAX_OVERRIDE_ROWS))
      "
    />
    <div v-else-if="!series.length" class="text-sm text-mono-500">
      {{ $t('chartsDynamicNoSeries', 'No series.') }}
    </div>
    <div v-else class="flex flex-col gap-5">
      <div
        v-for="(item, i) in series"
        :key="item.key"
        class="flex items-center gap-10 bg-white border border-mono-300 rounded px-5 py-3"
      >
        <span
          v-if="hasSeriesColors"
          :data-test="`chart-series-override-color-${item.key}`"
          :data-test-color="colorFor(item.key, i)"
          class="contents"
        >
          <ColorDropdown
            :color-id="colorFor(item.key, i)"
            @select="setColor(item.key, $event)"
          />
        </span>
        <span class="flex-1 truncate text-sm font-medium text-mono-800">
          {{ item.name }}
        </span>
        <button
          type="button"
          class="flex items-center justify-center size-30 text-mono-500 hover:text-accent-700"
          :data-test="`chart-series-override-hide-${item.key}`"
          :data-test-hidden="isHidden(item.key)"
          :title="
            isHidden(item.key)
              ? $t('chartsDynamicShowSeries', 'Show series')
              : $t('chartsDynamicHideSeries', 'Hide series')
          "
          @click="toggleHidden(item.key)"
        >
          <Icon
            :name="
              isHidden(item.key) ? 'bk_mdi_visibility_off' : 'bk_mdi_visibility'
            "
            class="[&_svg]:size-20"
          />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, useBlokkli } from '#imports'
import { Icon, InfoBox } from '#blokkli/editor/components'
import ColorDropdown from '../ColorDropdown/index.vue'
import type {
  ChartDataSourceSeries,
  ChartSeriesOverride,
} from '../../../../types'

const props = defineProps<{
  series: ChartDataSourceSeries[]
  overrides: Record<string, ChartSeriesOverride>
  hasSeriesColors: boolean
}>()

const emit = defineEmits<{
  'update:overrides': [Record<string, ChartSeriesOverride>]
}>()

const { $t, config } = useBlokkli()

const MAX_OVERRIDE_ROWS = 200

const colorOptions = computed(() => config.colorOptions.value)

function fallbackColor(index: number): string {
  const opts = colorOptions.value
  if (opts.length === 0) return ''
  return opts[index % opts.length]?.id ?? opts[0]?.id ?? ''
}

function colorFor(seriesKey: string, index: number): string {
  return props.overrides[seriesKey]?.color ?? fallbackColor(index)
}

function isHidden(seriesKey: string): boolean {
  return props.overrides[seriesKey]?.hidden === true
}

function patch(seriesKey: string, patch: Partial<ChartSeriesOverride>) {
  const existing = props.overrides[seriesKey] ?? {}
  const merged: ChartSeriesOverride = { ...existing, ...patch }
  const next: Record<string, ChartSeriesOverride> = {}
  for (const key of Object.keys(props.overrides)) {
    if (key !== seriesKey) next[key] = props.overrides[key]!
  }
  if (merged.color !== undefined || merged.hidden !== undefined) {
    next[seriesKey] = merged
  }
  emit('update:overrides', next)
}

function setColor(seriesKey: string, colorId: string) {
  patch(seriesKey, { color: colorId })
}

function toggleHidden(seriesKey: string) {
  patch(seriesKey, { hidden: !isHidden(seriesKey) || undefined })
}
</script>
