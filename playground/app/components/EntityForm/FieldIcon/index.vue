<template>
  <div class="icon-selector">
    <label v-for="symbol in ALL_SYMBOL_KEYS" :key="symbol">
      <input
        type="radio"
        :value="symbol"
        name="icon_selector"
        @change="$emit('update:modelValue', symbol)"
      />
      <div>
        <SpriteSymbol :name="symbol" class="aspect-square" />
      </div>
    </label>
  </div>
</template>

<script lang="ts" setup>
import { ALL_SYMBOL_KEYS } from '#nuxt-svg-sprite/data'

defineProps<{
  modelValue: string
}>()

defineEmits(['update:modelValue'])
</script>

<style lang="postcss">
.icon-selector {
  @apply flex gap-20 flex-wrap;

  label {
    @apply relative border flex items-center justify-center flex-1 max-w-[80px] aspect-square cursor-pointer min-w-[80px];
    input {
      @apply absolute top-0 left-0 w-full h-full appearance-none opacity-0;
    }
    div {
      @apply absolute top-0 left-0 w-full p-15 h-full;
    }

    input:checked + div {
      @apply ring ring-accent-700;
    }
  }

  &.is-media {
    label {
      @apply max-w-[250px];
      img {
        @apply w-full h-full relative top-0 left-0 object-cover;
      }
    }
  }
}
</style>
