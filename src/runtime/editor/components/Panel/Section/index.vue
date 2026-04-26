<template>
  <div
    class="bg-white border border-mono-400 shadow-md w-full"
    :class="{ 'pointer-events-none bg-mono-100!': disabled }"
  >
    <div
      class="text-xs uppercase tracking-wider text-mono-700 font-semibold px-15 py-10 border-b border-b-mono-300 rounded-t-md bg-white"
      :class="{
        'bg-mono-100! text-mono-400!': disabled,
      }"
    >
      {{ title }}
    </div>
    <div
      class="bk-panel-section-inner"
      :class="{
        'opacity-50': disabled,
      }"
    >
      <slot />
    </div>
    <div
      v-if="$slots.actions"
      class="flex items-center border-t border-t-mono-300 rounded-b-md overflow-hidden"
      :class="{
        'opacity-50': disabled,
      }"
    >
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  disabled?: boolean
}>()

defineOptions({
  name: 'PanelSection',
})
</script>
