<template>
  <label class="bk-checkbox-toggle group/tooltip">
    <slot />
    <input v-model="value" type="checkbox" class="peer" :disabled />
    <div class="bk-checkbox-toggle-toggle" />
    <div v-if="label || description" class="bk-checkbox-toggle-label">
      <div v-if="label" class="bk-checkbox-toggle-label-label">{{ label }}</div>
      <div v-if="description" class="bk-checkbox-toggle-label-description">
        {{ description }}
      </div>
      <div v-if="disabledReason" class="bk-form-disabled-reason">
        {{ disabledReason }}
      </div>
    </div>
    <Tooltip
      v-if="tooltip"
      :label="tooltip"
      class="max-w-full whitespace-normal"
    />
  </label>
</template>

<script setup lang="ts">
import Tooltip from '#blokkli/editor/components/Tooltip/index.vue'

defineProps<{
  label?: string
  description?: string
  tooltip?: string
  disabled?: boolean
  disabledReason?: string | null
}>()

const value = defineModel<boolean>()
</script>

<style lang="postcss">
.bk {
  .bk-checkbox-toggle {
    @apply relative flex cursor-pointer h-full text-mono-800 leading-none;

    &:has(input[disabled]) {
      @apply !cursor-not-allowed !text-mono-300;
      .bk-checkbox-toggle-toggle {
        @apply !bg-mono-200;
      }

      .bk-checkbox-toggle-label-description {
        @apply text-mono-300;
      }
    }

    .bk-form-disabled-reason {
      @apply mt-8;
    }

    &:focus-within {
      input + .bk-checkbox-toggle-toggle {
        @apply outline outline-accent-950/80 outline-offset-2;
      }
    }

    .bk-checkbox-toggle-label {
      .bk-checkbox-toggle-label-label {
        @apply font-semibold;
      }
      .bk-checkbox-toggle-label-description {
        @apply text-sm text-mono-600 text-pretty max-w-[500px];
      }
      @apply inline-block pr-10 text-base;
    }

    @media not all and (hover: none) {
      @apply hover:text-accent-800;
    }
    input {
      @apply sr-only;
    }
    input:checked + .bk-checkbox-toggle-toggle {
      @apply after:translate-x-full after:border-white bg-accent-800;
    }
    @media not all and (hover: none) {
      input:not(:checked):hover + .bk-checkbox-toggle-toggle {
        @apply bg-mono-500;
      }
      input:checked:hover + .bk-checkbox-toggle-toggle {
        @apply bg-accent-700;
      }
    }

    .bk-checkbox-toggle-toggle {
      @apply relative w-[36px] h-20 bg-mono-400 rounded-full  flex-shrink-0;
      @apply after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-[16px] after:w-[16px];
      @apply mr-5;
      @apply last:mr-0 mt-[2px];
    }
  }
}
</style>
