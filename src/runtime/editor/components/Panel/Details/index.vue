<template>
  <div
    class="bg-white bk-panel-item"
    :class="{
      'hover:bg-mono-100': !isOpen,
    }"
  >
    <button
      type="button"
      class="p-15 flex items-center justify-between w-full"
      @click.prevent="isOpen = !isOpen"
    >
      <div>
        <div class="font-semibold">{{ title }}</div>
        <div v-if="description" class="text-sm text-mono-600">
          {{ description }}
        </div>
      </div>
      <Icon
        name="bk_mdi_arrow_drop_down"
        class="shrink-0 size-20"
        :class="{
          'rotate-180': isOpen,
        }"
      />
    </button>
    <TransitionHeight>
      <div v-if="isOpen">
        <div class="px-15 pb-15">
          <slot />
        </div>
      </div>
    </TransitionHeight>
  </div>
</template>

<script setup lang="ts">
import TransitionHeight from '#blokkli/editor/components/Transition/Height.vue'
import Icon from '#blokkli/editor/components/Icon/index.vue'

defineProps<{
  title: string
  description?: string
}>()

const isOpen = defineModel<boolean>({ default: false })
</script>
