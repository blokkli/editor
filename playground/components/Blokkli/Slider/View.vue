<template>
  <div>
    <BlokkliItem v-if="activeItem" v-bind="activeItem" :key="activeItem.uuid" />
  </div>
  <div
    class="flex items-center justify-center mb-25"
    @click.stop.capture
    @mousedown.stop.capture
    @pointerdown.stop.capture
  >
    <ul class="flex gap-15">
      <li v-for="n in items.length" :key="n">
        <button
          class="size-25 bg-mono-300 rounded-full"
          @click="activeIndex = n - 1"
          :class="{
            '!bg-accent-700': activeIndex === n - 1,
          }"
        />
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import type { FieldListItem } from '#blokkli/types'
import { ref, computed } from '#imports'

const props = defineProps<{
  items: FieldListItem[]
}>()

const activeIndex = ref(0)

const activeItem = computed(() => props.items[activeIndex.value])
</script>
