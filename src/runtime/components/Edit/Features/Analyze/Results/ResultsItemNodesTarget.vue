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
import { renderCycle } from '#blokkli/helpers/renderCycle'

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
      return (props.target.textContent ?? '').slice(0, 50)
    } else if (typeof props.target === 'object' && 'uuid' in props.target) {
      return props.target.uuid
    }
  }
}

function findClosestUuid(element: HTMLElement): string | undefined {
  const closestBlock = element.closest('[data-uuid]')

  if (closestBlock instanceof HTMLElement) {
    const uuid = closestBlock.dataset.uuid
    if (uuid) {
      return uuid
    }
  }
}

async function onClick() {
  const element = getElement()
  if (!element) {
    return
  }

  const closestUuid = findClosestUuid(element)

  if (closestUuid) {
    eventBus.emit('select', closestUuid)
  } else {
    eventBus.emit('select:unselect')
  }

  await renderCycle()

  eventBus.emit('scrollIntoView', {
    element,
    highlight: true,
  })
}
</script>
