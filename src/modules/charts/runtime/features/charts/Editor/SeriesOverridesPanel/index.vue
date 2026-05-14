<template>
  <div class="flex flex-col gap-5 p-panel-gap">
    <div class="bk-form-label">
      {{ $t('chartsTranslationsSeries', 'Series') }}
    </div>
    <InfoBox
      v-if="seriesNames.length > MAX_OVERRIDE_ROWS"
      small
      :text="
        $t(
          'chartsDynamicOverridesTooMany',
          'Too many items to configure inline (@count, max @max).',
        )
          .replace('@count', String(seriesNames.length))
          .replace('@max', String(MAX_OVERRIDE_ROWS))
      "
    />
    <div v-else-if="!seriesNames.length" class="text-sm text-mono-500">
      {{ $t('chartsDynamicNoSeries', 'No series.') }}
    </div>
    <div v-else class="flex flex-col gap-5">
      <div
        v-for="(name, i) in seriesNames"
        :key="name"
        class="flex items-center gap-10 bg-white border border-mono-300 rounded px-5 py-3"
      >
        <ColorDropdown
          v-if="hasSeriesColors"
          :color-id="colorFor(name, i)"
          @select="setColor(name, $event)"
        />
        <span class="flex-1 truncate text-sm font-medium text-mono-800">
          {{ name }}
        </span>
        <button
          type="button"
          class="flex items-center justify-center size-30 text-mono-500 hover:text-accent-700"
          :title="
            isHidden(name)
              ? $t('chartsDynamicShowSeries', 'Show series')
              : $t('chartsDynamicHideSeries', 'Hide series')
          "
          @click="toggleHidden(name)"
        >
          <Icon
            :name="
              isHidden(name) ? 'bk_mdi_visibility_off' : 'bk_mdi_visibility'
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
import type { ChartSeriesOverride } from '../../../../types'

const props = defineProps<{
  seriesNames: string[]
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

function colorFor(name: string, index: number): string {
  return props.overrides[name]?.color ?? fallbackColor(index)
}

function isHidden(name: string): boolean {
  return props.overrides[name]?.hidden === true
}

function patch(name: string, patch: Partial<ChartSeriesOverride>) {
  const existing = props.overrides[name] ?? {}
  const merged: ChartSeriesOverride = { ...existing, ...patch }
  const next: Record<string, ChartSeriesOverride> = {}
  for (const key of Object.keys(props.overrides)) {
    if (key !== name) next[key] = props.overrides[key]!
  }
  if (merged.color !== undefined || merged.hidden !== undefined) {
    next[name] = merged
  }
  emit('update:overrides', next)
}

function setColor(name: string, colorId: string) {
  patch(name, { color: colorId })
}

function toggleHidden(name: string) {
  patch(name, { hidden: !isHidden(name) || undefined })
}
</script>
