<template>
  <div class="bk-analyze-results-item-nodes-target">
    <div>
      <button @click.prevent="onClick">
        <Icon name="eye" />
        <span>{{ target }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '#blokkli/components'
import { useBlokkli } from '#imports'

const props = defineProps<{
  target: string | HTMLElement
}>()

const { eventBus } = useBlokkli()

function onClick() {
  const element =
    typeof props.target === 'string'
      ? document.querySelector(props.target)
      : props.target
  if (!(element instanceof HTMLElement)) {
    return
  }

  eventBus.emit('scrollIntoView', {
    element,
    highlight: true,
  })
}
</script>
