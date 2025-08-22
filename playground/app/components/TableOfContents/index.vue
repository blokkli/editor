<template>
  <div class="container">
    <ul>
      <li v-for="item in listItems" :key="item.uuid">
        {{ item.title }}
      </li>
    </ul>
  </div>
</template>

<script lang="ts" setup>
import { computed, useBlokkliHelper } from '#imports'
import { getRuntimeOptions } from '#blokkli/runtime-helpers'
import type { FieldListItemTyped } from '#blokkli-build/generated-types'

defineProps<{
  items: FieldListItemTyped[]
}>()

const { queryBlocks } = useBlokkliHelper()

const blocks = queryBlocks(['title'])

const listItems = computed(() =>
  blocks.value
    .filter((v) => {
      const options = getRuntimeOptions(v)
      return options.showInMenu
    })
    .map((v) => {
      return {
        uuid: v.uuid,
        title: v.props.title,
      }
    }),
)
</script>
