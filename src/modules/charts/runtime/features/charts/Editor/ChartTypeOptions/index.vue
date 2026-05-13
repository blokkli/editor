<template>
  <div>
    <FormItem>
      <FormText
        id="chart-title"
        :label="$t('chartsTitle', 'Title')"
        :model-value="title"
        lazy
        @update:model-value="$emit('update:title', $event ?? '')"
      />
    </FormItem>

    <FormItem v-if="ungroupedOptions.length">
      <div class="grid gap-15">
        <Field
          v-for="item in ungroupedOptions"
          :key="item.key"
          :option-key="item.key"
          :option="item.option"
          :value="typeOptions[item.key]"
          @update="updateOption(item.key, $event)"
        />
      </div>
    </FormItem>

    <FormItem v-for="group in groups" :key="'group_' + group.label">
      <div class="bk-form-label">{{ group.label }}</div>
      <div class="grid gap-15">
        <Field
          v-for="item in group.options"
          :key="item.key"
          :option-key="item.key"
          :option="item.option"
          :value="typeOptions[item.key]"
          @update="updateOption(item.key, $event)"
        />
      </div>
    </FormItem>
  </div>
</template>

<script setup lang="ts">
import { computed, useBlokkli } from '#imports'
import type { ChartTypeDefinition } from '../../../../chartTypes/types'
import { FormText, FormItem } from '#blokkli/editor/components'
import Field from './Field.vue'

type ChartOption = ChartTypeDefinition['editor']['options'][string]

const { $t } = useBlokkli()

const props = defineProps<{
  title: string
  options: Record<string, ChartOption>
  typeOptions: Record<string, unknown>
}>()

const emit = defineEmits<{
  'update:title': [value: string]
  'update:typeOptions': [value: Record<string, unknown>]
}>()

type OptionEntry = {
  key: string
  option: ChartOption
}

type OptionGroup = {
  label: string
  options: OptionEntry[]
}

const allOptions = computed<OptionEntry[]>(() =>
  Object.entries(props.options).map(([key, option]) => ({ key, option })),
)

const ungroupedOptions = computed(() =>
  allOptions.value.filter((v) => !v.option.group),
)

function getGroupLabel(group: string): string {
  if (group === 'display') {
    return $t('chartsOptionGroupDisplay', 'Display')
  } else if (group === 'labels') {
    return $t('chartsOptionGroupLabels', 'Labels')
  }
  return group
}

const groups = computed<OptionGroup[]>(() => {
  return Object.values(
    allOptions.value.reduce<Record<string, OptionGroup>>((acc, entry) => {
      if (entry.option.group) {
        if (!acc[entry.option.group]) {
          acc[entry.option.group] = {
            label: getGroupLabel(entry.option.group),
            options: [entry],
          }
        } else {
          acc[entry.option.group]!.options.push(entry)
        }
      }
      return acc
    }, {}),
  )
})

function updateOption(key: string, value: unknown) {
  emit('update:typeOptions', { ...props.typeOptions, [key]: value })
}
</script>
