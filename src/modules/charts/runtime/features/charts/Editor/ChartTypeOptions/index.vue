<template>
  <div v-if="hasOptions" class="bk-chart-type-options">
    <div
      v-for="group in toggleGroups"
      :key="group.key"
      class="bk-chart-type-options-group"
    >
      <div class="bk-form-label">{{ group.label }}</div>
      <div class="bk-chart-type-options-toggles">
        <FormToggle
          v-for="toggle in group.toggles"
          :key="toggle.key"
          :model-value="!!typeOptions[toggle.key]"
          :label="toggle.label"
          @update:model-value="updateOption(toggle.key, $event)"
        />
      </div>
    </div>
    <div
      v-for="(opt, key) in selectOptions"
      :key="key"
      class="bk-chart-type-options-item"
    >
      <FormSelect
        v-if="opt.options.length > 4"
        :id="'chart-opt-' + key"
        :label="opt.label"
        :options="opt.options"
        :model-value="String(typeOptions[key] ?? '')"
        @update:model-value="updateOption(key, $event)"
      />
      <FormRadio
        v-else
        :id="'chart-opt-' + key"
        :label="opt.label"
        :options="opt.options"
        :model-value="String(typeOptions[key] ?? '')"
        inline
        @update:model-value="updateOption(key, $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, useBlokkli } from '#imports'
import type {
  ChartTypeOptionDefinition,
  ChartOptionGroup,
  ChartTypeOptionSelect,
} from '../../../../chartTypes'
import { FormToggle, FormRadio, FormSelect } from '#blokkli/editor/components'

const { $t } = useBlokkli()

const props = defineProps<{
  options: Record<string, ChartTypeOptionDefinition>
  typeOptions: Record<string, unknown>
}>()

const emit = defineEmits<{
  'update:typeOptions': [value: Record<string, unknown>]
}>()

const GROUP_LABELS: Record<ChartOptionGroup, () => string> = {
  display: () => $t('chartsGroupDisplay', 'Display'),
  labels: () => $t('chartsGroupLabels', 'Labels'),
}

const GROUP_ORDER: ChartOptionGroup[] = ['display', 'labels']

const hasOptions = computed(() => Object.keys(props.options).length > 0)

const toggleGroups = computed(() => {
  const groups: Record<string, { key: string; label: string }[]> = {}
  for (const [key, opt] of Object.entries(props.options)) {
    if (opt.type === 'toggle') {
      const list = groups[opt.group] || (groups[opt.group] = [])
      list.push({ key, label: opt.label })
    }
  }
  return GROUP_ORDER.filter((g) => groups[g])
    .map((g) => ({
      key: g,
      label: GROUP_LABELS[g](),
      toggles: groups[g] || [],
    }))
})

const selectOptions = computed(() => {
  const result: Record<string, ChartTypeOptionSelect> = {}
  for (const [key, opt] of Object.entries(props.options)) {
    if (opt.type === 'select') {
      result[key] = opt
    }
  }
  return result
})

function updateOption(key: string, value: unknown) {
  emit('update:typeOptions', { ...props.typeOptions, [key]: value })
}
</script>
