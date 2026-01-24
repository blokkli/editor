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
