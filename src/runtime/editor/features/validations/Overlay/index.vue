<template>
  <Teleport to=".bk-main-canvas">
    <div class="bk bk-validations-overlay">
      <OverlayItem v-for="item in items" :key="item.uuid" v-bind="item" />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { itemEntityType } from '#blokkli-build/config'
import type { Validation } from '#blokkli/editor/types/state'
import { falsy } from '#blokkli/helpers'
import { computed } from '#imports'
import OverlayItem from './Item.vue'

const props = defineProps<{
  validations: Validation[]
}>()

const items = computed(() =>
  Object.entries(
    props.validations
      .map((v) => {
        if (v.entityType === itemEntityType && v.entityUuid) {
          return {
            uuid: v.entityUuid,
            message: v.message,
          }
        }

        return null
      })
      .filter(falsy)
      .reduce<Record<string, string[]>>((acc, v) => {
        if (!acc[v.uuid]) {
          acc[v.uuid] = [v.message]
        } else {
          acc[v.uuid]!.push(v.message)
        }

        return acc
      }, {}),
  ).map((v) => {
    return {
      uuid: v[0],
      messages: v[1],
    }
  }),
)
</script>

<style lang="postcss">
.bk.bk-validations-overlay {
  @apply absolute top-0 left-0 w-full h-full pointer-events-none;

  > div {
    @apply absolute top-0 left-0 border-3 border-red-normal bg-red-normal/10 box-border;

    > div {
      @apply bg-red-normal text-white px-10 py-5;
      @apply absolute -left-2 -right-2 font-bold;
      @apply bottom-full;
    }
  }
}

.bk {
  .bk-validation-item {
    @apply text-base text-mono-800 p-15 hover:bg-mono-50 w-full;
    @apply border-b border-b-mono-300;

    .bk-blokkli-item-icon {
      @apply size-25 bg-mono-200 p-3 border border-mono-400 rounded;
    }

    .bk-validation-item-header {
      @apply flex items-center gap-5 font-medium mb-10;
    }
  }
}
</style>
