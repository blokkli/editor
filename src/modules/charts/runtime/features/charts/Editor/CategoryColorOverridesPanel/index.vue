<template>
  <div class="flex flex-col gap-5 p-panel-gap">
    <div class="bk-form-label">
      {{ $t('chartsDynamicCategoryColors', 'Category colors') }}
    </div>
    <InfoBox
      v-if="categories.length > MAX_OVERRIDE_ROWS"
      small
      :text="
        $t(
          'chartsDynamicOverridesTooMany',
          'Too many items to configure inline (@count, max @max).',
        )
          .replace('@count', String(categories.length))
          .replace('@max', String(MAX_OVERRIDE_ROWS))
      "
    />
    <div v-else-if="!categories.length" class="text-sm text-mono-500">
      {{ $t('chartsDynamicNoCategories', 'No categories.') }}
    </div>
    <div v-else class="flex flex-col gap-5">
      <div
        v-for="(category, i) in categories"
        :key="category.key"
        class="flex items-center gap-10 bg-white border border-mono-300 rounded px-5 py-3"
      >
        <span
          :data-test="`chart-category-override-color-${category.key}`"
          :data-test-color="colorFor(category.key, i)"
          class="contents"
        >
          <ColorDropdown
            :color-id="colorFor(category.key, i)"
            @select="setColor(category.key, $event)"
          />
        </span>
        <span class="flex-1 truncate text-sm font-medium text-mono-800">
          {{ category.label }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, useBlokkli } from '#imports'
import { InfoBox } from '#blokkli/editor/components'
import ColorDropdown from '../ColorDropdown/index.vue'
import type { ChartDataSourceCategory } from '../../../../types'

const props = defineProps<{
  categories: ChartDataSourceCategory[]
  overrides: Record<string, string>
}>()

const emit = defineEmits<{
  'update:overrides': [Record<string, string>]
}>()

const { $t, config } = useBlokkli()

const MAX_OVERRIDE_ROWS = 200

const colorOptions = computed(() => config.colorOptions.value)

function fallbackColor(index: number): string {
  const opts = colorOptions.value
  if (opts.length === 0) return ''
  return opts[index % opts.length]?.id ?? opts[0]?.id ?? ''
}

function colorFor(categoryKey: string, index: number): string {
  return props.overrides[categoryKey] ?? fallbackColor(index)
}

function setColor(categoryKey: string, colorId: string) {
  const next = { ...props.overrides }
  next[categoryKey] = colorId
  emit('update:overrides', next)
}
</script>
