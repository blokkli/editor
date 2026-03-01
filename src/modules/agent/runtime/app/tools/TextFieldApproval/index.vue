<template>
  <Toolbar
    v-if="items.length > 0"
    v-model:current-index="currentIndex"
    :items="items"
    :selected="selected"
    :reasons="reasons"
    :apply-label="applyLabel"
    @update:selected="onUpdateSelected"
    @update:reasons="onUpdateReasons"
    @apply="onApply"
    @prev="prev"
    @next="next"
  />

  <Highlight
    ref="highlight"
    :items="items"
    :selected="selected"
    v-model="currentIndex"
    @toggle="onToggle"
  />
</template>

<script lang="ts" setup>
import {
  computed,
  nextTick,
  onMounted,
  reactive,
  ref,
  useTemplateRef,
  useBlokkli,
} from '#imports'
import Toolbar from './Toolbar.vue'
import Highlight from './Highlight.vue'
import { onBlokkliEvent } from '#blokkli/editor/composables'
import { itemEntityType } from '#blokkli-build/config'
import type { EntityContext } from '#blokkli/types'

export type ApprovalItem = {
  id: number
  uuid: string
  fieldName: string
  fieldLabel: string
  value: string
}

const props = defineProps<{
  items: ApprovalItem[]
}>()

const emit = defineEmits<{
  (
    e: 'apply',
    data: {
      selected: Record<number, boolean>
      reasons: Record<number, string>
    },
  ): void
  (e: 'cancel'): void
}>()

const { $t, ui, eventBus, directive, context, blocks } = useBlokkli()

const highlight = useTemplateRef('highlight') as {
  value: InstanceType<typeof Highlight> | null
}

function resolveHost(uuid: string): EntityContext | null {
  if (uuid === context.value.entityUuid) {
    return {
      type: context.value.entityType,
      bundle: context.value.entityBundle,
      uuid,
    }
  }
  const block = blocks.getBlock(uuid)
  if (!block) return null
  return { type: itemEntityType, bundle: block.bundle, uuid }
}

function getItemRect(item: ApprovalItem): { x: number; y: number } | null {
  const host = resolveHost(item.uuid)
  if (!host) return null
  const el = directive.findEditableElement(item.fieldName, host)
  if (!el) return null
  return ui.getAbsoluteElementRect(el)
}

// Sort items once by visual position (top to bottom, left to right).
const items = [...props.items].sort((a, b) => {
  const rectA = getItemRect(a)
  const rectB = getItemRect(b)
  if (!rectA || !rectB) return 0
  const dy = rectA.y - rectB.y
  if (dy !== 0) return dy
  return rectA.x - rectB.x
})

const currentIndex = ref(0)

const selected = reactive<Record<number, boolean>>(
  Object.fromEntries(items.map((item) => [item.id, true])),
)
const reasons = reactive<Record<number, string>>(
  Object.fromEntries(items.map((item) => [item.id, ''])),
)

const selectedCount = computed(
  () => items.filter((item) => selected[item.id]).length,
)

const applyLabel = computed(() => {
  return $t('aiAgentBatchRewriteApply', 'Apply @count of @total')
    .replace('@count', selectedCount.value.toString())
    .replace('@total', items.length.toString())
})

function onUpdateSelected(id: number, value: boolean) {
  selected[id] = value
  nextTick(() => highlight.value?.updateRects())
}

function onToggle(id: number) {
  onUpdateSelected(id, !selected[id])
}

function onUpdateReasons(id: number, value: string) {
  reasons[id] = value
}

function onApply() {
  emit('apply', {
    selected: { ...selected },
    reasons: { ...reasons },
  })
}

function scrollToItem(item: ApprovalItem) {
  const host = resolveHost(item.uuid)
  if (host) {
    const el = directive.findEditableElement(item.fieldName, host)
    if (el) {
      eventBus.emit('scrollIntoView', { element: el, immediate: false })
      return
    }
  }
  eventBus.emit('scrollIntoView', { uuid: item.uuid, immediate: false })
}

function prev() {
  currentIndex.value = (currentIndex.value - 1 + items.length) % items.length
  scrollToItem(items[currentIndex.value]!)
}

function next() {
  currentIndex.value = (currentIndex.value + 1) % items.length
  scrollToItem(items[currentIndex.value]!)
}

onMounted(async () => {
  await nextTick()
  if (items[0]) {
    scrollToItem(items[0])
  }
})

onBlokkliEvent('keyPressed', (e) => {
  if ((e.code === 'Tab' && !e.shift) || e.code === 'ArrowDown') {
    e.originalEvent.preventDefault()
    next()
  } else if ((e.code === 'Tab' && e.shift) || e.code === 'ArrowUp') {
    e.originalEvent.preventDefault()
    prev()
  } else if (e.code === ' ') {
    e.originalEvent.preventDefault()
    const item = items[currentIndex.value]
    if (item) {
      onUpdateSelected(item.id, !selected[item.id])
    }
  }
})
</script>
