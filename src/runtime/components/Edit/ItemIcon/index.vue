<template>
  <div v-if="markup" class="bk-blokkli-item-icon" v-html="markup" />
  <div v-else-if="bundle === 'from_library'" class="bk-blokkli-item-icon">
    <Icon name="reusable" />
  </div>
  <div v-else class="bk-blokkli-item-icon">
    <Icon name="question" />
  </div>
</template>

<script lang="ts" setup>
import { icons } from '#blokkli/definitions'
import { Icon } from '#blokkli/components'

const props = defineProps<{
  bundle?: string
}>()

const markup = computed(() => {
  return props.bundle ? icons[props.bundle] : undefined
})
</script>
