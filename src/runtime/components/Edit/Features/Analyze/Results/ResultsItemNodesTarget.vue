<template>
  <div class="bk-analyze-results-item-nodes-target">
    <div>
      <button @click.prevent="onClick">
        <Icon name="eye" />
        <span>{{ getLabel() }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '#blokkli/components'
import { useBlokkli } from '#imports'

const props = defineProps<{
  target: string | HTMLElement | { uuid: string }
}>()

const { eventBus, dom } = useBlokkli()

function getElement(): HTMLElement | null {
  if (props.target) {
    if (typeof props.target === 'string') {
      return document.querySelector(props.target)
    } else if (props.target instanceof HTMLElement) {
      return props.target
    } else if (typeof props.target === 'object' && 'uuid' in props.target) {
      const block = dom.findBlock(props.target.uuid)
      if (block) {
        return block.element()
      }
    }
  }

  return null
}

function getLabel() {
  if (props.target) {
    if (typeof props.target === 'string') {
      return props.target
    } else if (props.target instanceof HTMLElement) {
      return props.target.innerText.slice(0, 50)
    } else if (typeof props.target === 'object' && 'uuid' in props.target) {
      return props.target.uuid
    }
  }
}

function onClick() {
  const element = getElement()
  if (!element) {
    return
  }

  eventBus.emit('scrollIntoView', {
    element,
    highlight: true,
  })
}
</script>
