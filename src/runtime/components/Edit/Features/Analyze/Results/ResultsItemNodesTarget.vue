<template>
  <div
    class="bk-analyze-results-item-nodes-target"
    :class="{
      'bk-is-focused': isFocused,
    }"
  >
    <div>
      <button ref="elButton" @click.prevent="onClick">
        <Icon name="bk_mdi_visibility-fill" />
        <span>{{ getLabel() }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '#blokkli/components'
import { computed, useBlokkli, useTemplateRef, watch } from '#imports'
import { renderCycle } from '#blokkli/editor/helpers/vue'
import type { AnalyzeNodeTargetMapped } from '#blokkli/analyzer/types'

const props = defineProps<{
  resultId: string
  target: AnalyzeNodeTargetMapped
}>()

const { eventBus, dom, blocks, element } = useBlokkli()

const activeId = defineModel<string>({ default: '' })

const activeIndex = computed(() => {
  const index = activeId.value.split('_____')[1]
  if (index === undefined) {
    return -1
  }
  const indexNumber = Number.parseInt(index)

  if (Number.isNaN(indexNumber)) {
    return -1
  }

  return indexNumber
})

const elButton = useTemplateRef('elButton')

const isFocused = computed(() => activeIndex.value === props.target.globalIndex)

function getElement(): HTMLElement | null {
  if (props.target.target) {
    if (typeof props.target.target === 'string') {
      return element.query(
        document.documentElement,
        props.target.target,
        'Find analyze result item node target.',
      )
    } else if (props.target.target instanceof HTMLElement) {
      return props.target.target
    } else if (
      typeof props.target.target === 'object' &&
      'uuid' in props.target.target
    ) {
      const item = blocks.getBlock(props.target.target.uuid)
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
  if (props.target.target) {
    if (typeof props.target.target === 'string') {
      return props.target.target
    } else if (props.target.target instanceof HTMLElement) {
      if (props.target.target instanceof HTMLImageElement) {
        if (props.target.target.alt) {
          return props.target.target.alt.slice(0, 50)
        }
      }
      const textContent = (props.target.target.textContent ?? '').slice(0, 50)
      if (textContent) {
        return textContent
      }

      return getElementLabel(props.target.target.tagName)
    } else if (
      typeof props.target.target === 'object' &&
      'uuid' in props.target.target
    ) {
      return props.target.target.uuid
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
  if (activeIndex.value === props.target.globalIndex) {
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
  activeId.value = props.resultId + '_____' + props.target.globalIndex
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
