<template>
  <div ref="container" class="bk-dropdown-menu">
    <button
      class="bk-dropdown-menu-trigger"
      :disabled="disabled"
      @click="showMenu = !showMenu"
    >
      <slot name="button" />
    </button>
    <BlokkliTransition name="drop-up">
      <div
        v-if="showMenu"
        ref="contentEl"
        class="bk-dropdown-menu-content"
        :class="positionClass"
        @keydown="onContentKeydown"
      >
        <slot :close="close" />
      </div>
    </BlokkliTransition>
  </div>
</template>

<script lang="ts" setup>
import {
  ref,
  computed,
  watch,
  nextTick,
  onMounted,
  onBeforeUnmount,
  useTemplateRef,
  useBlokkli,
} from '#imports'
import { BlokkliTransition } from '#blokkli/editor/components'

const props = withDefaults(
  defineProps<{
    position?: 'bottom-left' | 'top-left' | 'top-right'
    disabled?: boolean
  }>(),
  {
    position: 'bottom-left',
    disabled: false,
  },
)

const { eventBus } = useBlokkli()

const container = useTemplateRef('container')
const contentEl = useTemplateRef('contentEl')
const showMenu = ref(false)

const positionClass = computed(() => `bk-is-${props.position}`)

function getFocusableItems(): HTMLElement[] {
  if (!contentEl.value) return []
  return Array.from(
    contentEl.value.querySelectorAll<HTMLElement>('button, input, [tabindex]'),
  )
}

function focusTrigger() {
  const trigger = container.value?.querySelector<HTMLElement>(
    '.bk-dropdown-menu-trigger',
  )
  trigger?.focus()
}

function close() {
  if (!showMenu.value) return
  showMenu.value = false
  focusTrigger()
}

watch(showMenu, (open) => {
  if (open) {
    nextTick(() => {
      const items = getFocusableItems()
      items[0]?.focus()
    })
  }
})

function onContentKeydown(e: KeyboardEvent) {
  const { key } = e

  if (key === 'Escape') {
    e.preventDefault()
    e.stopPropagation()
    close()
    return
  }

  if (key === 'ArrowDown' || key === 'ArrowUp') {
    e.preventDefault()
    e.stopPropagation()
    const items = getFocusableItems()
    if (!items.length) return
    const current = items.indexOf(document.activeElement as HTMLElement)
    let next: number
    if (key === 'ArrowDown') {
      next = current < items.length - 1 ? current + 1 : 0
    } else {
      next = current > 0 ? current - 1 : items.length - 1
    }
    items[next]?.focus()
    return
  }

  // Stop all other keydown events from bubbling out of the dropdown.
  e.stopPropagation()
}

function onDocumentClick(e: MouseEvent) {
  if (!container.value?.contains(e.target as Node)) {
    close()
  }
}

eventBus.on('mouse:up', close)

onMounted(() => document.addEventListener('click', onDocumentClick))
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  eventBus.off('mouse:up', close)
})

defineExpose({ close })
</script>
