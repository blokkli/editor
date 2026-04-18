<template>
  <div class="bk-plugin-config-form-inline">
    <slot name="before" />
    <div v-for="filter in filters" :key="filter.name">
      <label v-if="filter.type === 'text'" class="bk-form-text">
        <Icon name="bk_mdi_search" />
        <input
          :value="modelValue[filter.name]"
          type="text"
          :placeholder="filter.placeholder"
          @change="
            emit('update:modelValue', {
              ...modelValue,
              [filter.name]: ($event.target as HTMLInputElement).value,
            })
          "
        />
      </label>
      <FilterSelect
        v-else-if="filter.type === 'options'"
        :model-value="modelValue[filter.name]"
        :label="filter.label"
        :options="filter.options"
        @update:model-value="
          emit('update:modelValue', {
            ...modelValue,
            [filter.name]: $event,
          })
        "
      />
      <FormToggle
        v-else-if="filter.type === 'checkbox'"
        :model-value="modelValue[filter.name]"
        :label="filter.label"
        @update:model-value="
          emit('update:modelValue', {
            ...modelValue,
            [filter.name]: $event,
          })
        "
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { FormToggle, Icon } from '#blokkli/editor/components'
import FilterSelect from './FilterSelect/index.vue'
import type { PluginConfigInput } from '#blokkli/editor/types/pluginConfig'

defineProps<{
  filters: PluginConfigInput[]
  modelValue: Record<string, any>
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, any>]
}>()
</script>

<style lang="postcss">
.bk .bk-plugin-config-form-inline {
  @apply flex whitespace-nowrap flex-wrap relative z-[5000] gap-x-1 bg-mono-300;
  flex: 0 0 auto;

  > div {
    @apply h-[54px] flex-1 bg-white;
    @apply hover:bg-mono-100;
    @apply border-b border-b-mono-300;

    .bk-checkbox-toggle {
      @apply w-full py-15 px-10 cursor-pointer;
      .bk-checkbox-toggle-label-label {
        @apply text-sm;
      }
    }

    .bk-form-text {
      @apply relative;
      .bk-icon {
        @apply absolute top-1/2 left-5 -translate-y-1/2 z-50 size-20;
        @apply text-mono-500;
        svg {
          @apply fill-current;
        }
      }
      input {
        @apply bg-transparent text-sm !outline-0 !border-0 focus:!outline-0 !shadow-none;
      }

      &:focus-within {
        .bk-icon {
          @apply text-accent-700;
        }
      }

      > input {
        @apply w-full pl-30 !pr-5 h-full block;
        @apply min-w-[200px];
      }
    }
  }
}
</style>
