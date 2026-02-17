<template>
  <div class="bk-chart-type-options">
    <OptionsFormItem
      :option="titleOption"
      property="title"
      :mutated-value="title"
      @update="$emit('update:title', $event)"
    />

    <OptionsFormItem
      v-for="item in ungroupedOptions"
      :key="item.key"
      :option="item.option"
      :property="item.key"
      :mutated-value="typeOptions[item.key] ?? item.option.default"
      @update="updateOption(item.key, $event)"
    />

    <OptionsFormGroup
      v-for="group in groups"
      :key="'group_' + group.label"
      :label="group.label"
      :is-active="group.label === activeGroup"
      @toggle="onToggleGroup(group.label)"
    >
      <OptionsFormItem
        v-for="item in group.options"
        :key="item.key"
        :option="item.option"
        :property="item.key"
        :mutated-value="typeOptions[item.key] ?? item.option.default"
        is-grouped
        @update="updateOption(item.key, $event)"
      />
    </OptionsFormGroup>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useBlokkli } from '#imports'
import type { BlockOptionDefinition } from '#blokkli/types/blockOptions'
import OptionsFormItem from '#blokkli/editor/features/options/Form/Item.vue'
import OptionsFormGroup from '#blokkli/editor/features/options/Form/Group.vue'

const { $t } = useBlokkli()

const props = defineProps<{
  title: string
  options: Record<string, BlockOptionDefinition>
  typeOptions: Record<string, unknown>
}>()

const emit = defineEmits<{
  'update:title': [value: unknown]
  'update:typeOptions': [value: Record<string, unknown>]
}>()

const titleOption: BlockOptionDefinition = {
  type: 'text',
  label: $t('chartsTitle', 'Title'),
  default: '',
}

type OptionEntry = {
  key: string
  option: BlockOptionDefinition
}

type OptionGroup = {
  label: string
  options: OptionEntry[]
}

const activeGroup = ref('')

function onToggleGroup(label: string) {
  if (activeGroup.value === label) {
    activeGroup.value = ''
  } else {
    activeGroup.value = label
  }
}

const allOptions = computed<OptionEntry[]>(() =>
  Object.entries(props.options).map(([key, option]) => ({ key, option })),
)

const ungroupedOptions = computed(() =>
  allOptions.value.filter((v) => !v.option.group),
)

const groups = computed<OptionGroup[]>(() => {
  return Object.values(
    allOptions.value.reduce<Record<string, OptionGroup>>((acc, entry) => {
      if (entry.option.group) {
        if (!acc[entry.option.group]) {
          acc[entry.option.group] = {
            label: entry.option.group,
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
