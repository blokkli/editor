<template>
  <div
    class="bk-analyze-results-item-nodes-target"
    :class="{
      'bk-is-focused': isFocused,
    }"
  >
    <div>
      <button ref="elButton" @click.prevent="onClick">
        <Icon name="eye" />
        <span>{{ getLabel() }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '#blokkli/components'
import { ref, useBlokkli, useTemplateRef } from '#imports'
import { renderCycle } from '#blokkli/helpers/renderCycle'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'

const props = defineProps<{
  resultId: string
  target: string | HTMLElement | { uuid: string }
}>()

const { eventBus, dom, blocks, element } = useBlokkli()

const elButton = useTemplateRef('elButton')

const isFocused = ref(false)
let focusTimeout: null | number = null

function getElement(): HTMLElement | null {
  if (props.target) {
    if (typeof props.target === 'string') {
      return element.query(
        document.documentElement,
        props.target,
        'Find analyze result item node target.',
      )
    } else if (props.target instanceof HTMLElement) {
      return props.target
    } else if (typeof props.target === 'object' && 'uuid' in props.target) {
      const item = blocks.getBlock(props.target.uuid)
      if (item) {
        return dom.getDragElement(item) ?? null
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
  const closestBlock = element.closest('[data-bk-uuid]')

  if (closestBlock instanceof HTMLElement) {
    const uuid = closestBlock.dataset.bkUuid
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
