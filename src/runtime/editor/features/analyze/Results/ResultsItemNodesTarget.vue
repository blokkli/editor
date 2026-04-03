<template>
  <div
    class="bk-analyze-results-item-nodes-target relative flex items-center gap-5 pr-5"
    :class="{
      'bg-accent-700': isFocused,
    }"
  >
    <button
      ref="elButton"
      class="flex-1 min-w-0 text-mono-600 flex items-center gap-5 hover:underline underline-offset-[3px] py-[7px] px-10 hover:text-accent-700 scroll-mt-50"
      :class="{
        '!text-accent-50': isFocused,
      }"
      @click.prevent="onClick"
    >
      <div v-if="node.score != null && node.scoreLabel">
        <span class="bk-pill shrink-0">{{ node.score.toFixed(1) }}</span>
      </div>
      <span class="truncate w-full inline-block font-mono">{{
        getLabel()
      }}</span>
    </button>
    <button
      v-if="node.identifier"
      class="shrink-0 size-25 flex items-center justify-center rounded group/tooltip relative"
      :class="
        isFocused
          ? 'text-accent-200 hover:text-accent-700 hover:bg-white'
          : 'text-mono-500 hover:bg-accent-700 hover:text-accent-50'
      "
      @click.prevent="
        eventBus.emit(node.ignored ? 'analyze:unignore' : 'analyze:ignore', {
          resultId,
          identifier: node.identifier!,
        })
      "
    >
      <Icon
        :name="node.ignored ? 'bk_mdi_visibility' : 'bk_mdi_visibility_off'"
        class="size-15"
      />
      <Tooltip
        placement="center-before"
        small
        :label="
          node.ignored
            ? $t('analyzeUnignore', 'Restore')
            : $t('analyzeIgnore', 'Ignore')
        "
      />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, useBlokkli, useTemplateRef, watch } from '#imports'
import { renderCycle } from '#blokkli/editor/helpers/vue'
import type {
  AnalyzeNodeMapped,
  AnalyzeNodeTargetMapped,
} from '#blokkli/analyzer/types'
import { Icon, Tooltip } from '#blokkli/editor/components'

const props = defineProps<{
  resultId: string
  node: AnalyzeNodeMapped
  target: AnalyzeNodeTargetMapped
}>()

const { $t, eventBus, dom, blocks, element } = useBlokkli()

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

watch(
  isFocused,
  (isFocused) => {
    if (!isFocused) {
      return
    }
    if (elButton.value) {
      elButton.value.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      })
    }
  },
  { immediate: true },
)
</script>
