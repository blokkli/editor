<template>
  <Teleport to=".bk-main-canvas">
    <div class="bk bk-validations-overlay">
      <OverlayItem v-for="item in items" :key="item.uuid" v-bind="item" />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { falsy } from '#blokkli/helpers'
import { type Validation } from '#blokkli/types'
import { useBlokkli, computed } from '#imports'
import OverlayItem from './Item.vue'

const props = defineProps<{
  validations: Validation[]
}>()

const { runtimeConfig } = useBlokkli()

const items = computed(() =>
  Object.entries(
    props.validations
      .map((v) => {
        if (v.entityType === runtimeConfig.itemEntityType && v.entityUuid) {
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
          acc[v.uuid] = []
        }

        acc[v.uuid].push(v.message)

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
