<template>
  <div role="tablist" class="inline-flex -mb-1">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      type="button"
      role="tab"
      :aria-selected="modelValue === tab.id"
      class="px-15 py-8 text-base font-semibold border first:border-l-0"
      :class="
        modelValue === tab.id
          ? 'text-accent-700 border-mono-400 border-b-white! bg-white'
          : 'text-mono-500 border-transparent hover:text-mono-800'
      "
      @click.prevent="modelValue = tab.id"
    >
      {{ tab.label }}
    </button>
  </div>
</template>

<script lang="ts" setup generic="T extends string = string">
export type PanelTabItem<Id extends string = string> = {
  id: Id
  label: string
}

defineProps<{
  tabs: PanelTabItem<T>[]
}>()

const modelValue = defineModel<T>({ required: true })
</script>
