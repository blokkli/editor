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
import { computed, useBlokkli, useTemplateRef, watch } from '#imports'
import { renderCycle } from '#blokkli/helpers/renderCycle'

const props = defineProps<{
  resultId: string
  index: number
  target: string | HTMLElement | { uuid: string }
}>()

const { eventBus, dom, blocks, element } = useBlokkli()

const activeId = defineModel<string>({ default: '' })

const elButton = useTemplateRef('elButton')

const id = computed(() => props.resultId + '_____' + props.index)

const isFocused = computed(() => activeId.value === id.value)

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

function getElementLabel(tagName: string): string {
  return `<${tagName.toLowerCase()}>`
}

function getLabel() {
  if (props.target) {
    if (typeof props.target === 'string') {
      return props.target
    } else if (props.target instanceof HTMLElement) {
      if (props.target instanceof HTMLImageElement) {
        if (props.target.alt) {
          return props.target.alt.slice(0, 50)
        }
      }
      const textContent = (props.target.textContent ?? '').slice(0, 50)
      if (textContent) {
        return textContent
      }

      return getElementLabel(props.target.tagName)
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
  if (activeId.value === id.value) {
    activeId.value = ''
    return
  }

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
  activeId.value = id.value
}

watch(isFocused, (isFocused) => {
  if (!isFocused) {
    return
  }
  if (elButton.value) {
    elButton.value.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    })
  }
})
</script>
