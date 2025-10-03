<template>
  <div
    class="bk-analyze-results-item-nodes-target"
    :class="{
      'bk-is-focused': isFocused,
    }"
  >
    <div>
      <button @click.prevent="onClick" ref="elButton">
        <Icon name="eye" />
        <span>{{ getLabel() }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '#blokkli/components'
import { ref, useBlokkli, useTemplateRef, watch } from '#imports'
import { renderCycle } from '#blokkli/helpers/renderCycle'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'

const props = defineProps<{
  resultId: string
  target: string | HTMLElement | { uuid: string }
}>()

const { eventBus, dom, selection } = useBlokkli()

const elButton = useTemplateRef('elButton')

const isFocused = ref(false)
let focusTimeout: null | number = null

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
  })
}

onBlokkliEvent('analyze:click-node', (e) => {
  isFocused.value = false
  if (focusTimeout) {
    window.clearTimeout(focusTimeout)
  }
  if (e.id === props.resultId) {
    const el = getElement()
    if (el === e.target && elButton.value) {
      elButton.value.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
      isFocused.value = true
      focusTimeout = window.setTimeout(() => {
        isFocused.value = false
      }, 1000)
      return
    }
  }
})
</script>
