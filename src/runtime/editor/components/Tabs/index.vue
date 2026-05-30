<template>
  <div
    class="bg-mono-950 pt-15 px-15 lg:px-20 xl:px-30 border-t border-t-mono-600"
  >
    <div role="tablist">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        role="tab"
        :data-test-tab="tab.id"
        :aria-selected="modelValue === tab.id"
        :class="{
          '!bg-mono-100 !text-mono-900': modelValue === tab.id && mono,
          '!bg-white !text-mono-900': modelValue === tab.id && !mono,
          'hover:!bg-mono-700': modelValue !== tab.id,
        }"
        class="text-lg font-bold px-30 py-10 text-white rounded-t"
        @click.prevent="modelValue = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>
    <div v-if="$slots.default" class="bk-tabs-panel" role="tabpanel">
      <slot />
    </div>
  </div>
</template>

<script lang="ts" setup generic="T extends string = string">
export type TabItem<Id extends string = string> = {
  id: Id
  label: string
}

defineProps<{
  tabs: TabItem<T>[]
  mono?: boolean
}>()

const modelValue = defineModel<T>({ required: true })
</script>
