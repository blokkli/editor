<template>
  <div ref="container" class="bk-dropdown-menu relative">
    <button
      class="bk-dropdown-menu-trigger"
      :disabled="disabled"
      :class="buttonClass"
      @click="showMenu = !showMenu"
    >
      <slot name="button" />
    </button>
    <Teleport :to="teleport ?? 'body'" :disabled="!teleport">
      <BlokkliTransition name="drop-up">
        <div
          v-if="showMenu"
          ref="contentEl"
          class="bk-dropdown-menu-content rounded"
          :class="[originClass, !teleport ? positionClass : null]"
          :style="teleport ? floatingStyle : undefined"
          @keydown="onContentKeydown"
        >
          <slot :close="close" />
        </div>
      </BlokkliTransition>
    </Teleport>
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
  inject,
} from '#imports'
import { BlokkliTransition } from '#blokkli/editor/components'
import { onBlokkliEvent } from '#blokkli/editor/composables'
import {
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
  type Placement,
} from '@floating-ui/dom'
import { INJECT_POPUP_HOST } from '#blokkli/editor/helpers/injections'

type DropdownPosition = 'bottom-left' | 'top-left' | 'top-right'

const props = withDefaults(
  defineProps<{
    position?: DropdownPosition
    disabled?: boolean
    buttonClass?: string
  }>(),
  {
    position: 'bottom-left',
    disabled: false,
    buttonClass: undefined,
  },
)

const popupHostRef = inject(INJECT_POPUP_HOST, null)
const teleport = computed(() => popupHostRef?.value ?? null)

const container = useTemplateRef('container')
const contentEl = useTemplateRef<HTMLElement>('contentEl')
const showMenu = ref(false)

const positionClass = computed(() => `bk-is-${props.position}`)
const originClass = computed(() => `bk-origin-${props.position}`)

// `DropdownPosition` names the menu corner anchored to the trigger's adjacent
// corner (matching the `bk-is-*` CSS), not which side of the trigger the menu
// sits on. So `top-left` = menu's top-left at trigger's bottom-left = menu
// opens DOWNWARD = floating-ui placement `bottom-start`.
const PLACEMENT_MAP: Record<DropdownPosition, Placement> = {
  'bottom-left': 'top-start',
  'top-left': 'bottom-start',
  'top-right': 'bottom-end',
}

const floatingX = ref(0)
const floatingY = ref(0)
const floatingStyle = computed(() => ({
  position: 'fixed' as const,
  top: `${floatingY.value}px`,
  left: `${floatingX.value}px`,
}))

let stopAutoUpdate: (() => void) | null = null

function getTriggerEl(): HTMLElement | null {
  return (
    container.value?.querySelector<HTMLElement>('.bk-dropdown-menu-trigger') ??
    null
  )
}

async function updateFloatingPosition() {
  const triggerEl = getTriggerEl()
  const floatingEl = contentEl.value
  if (!triggerEl || !floatingEl) return
  const { x, y } = await computePosition(triggerEl, floatingEl, {
    placement: PLACEMENT_MAP[props.position],
    strategy: 'fixed',
    middleware: [offset(5), flip(), shift({ padding: 8 })],
  })
  floatingX.value = x
  floatingY.value = y
}

function stopFloating() {
  if (stopAutoUpdate) {
    stopAutoUpdate()
    stopAutoUpdate = null
  }
}

function getFocusableItems(): HTMLElement[] {
  if (!contentEl.value) return []
  return Array.from(
    contentEl.value.querySelectorAll<HTMLElement>('button, input, [tabindex]'),
  )
}

function focusTrigger() {
  getTriggerEl()?.focus()
}

function close() {
  if (!showMenu.value) return
  showMenu.value = false
  focusTrigger()
}

watch(showMenu, (open) => {
  if (open) {
    nextTick(() => {
      if (teleport.value) {
        const triggerEl = getTriggerEl()
        const floatingEl = contentEl.value
        if (triggerEl && floatingEl) {
          stopAutoUpdate = autoUpdate(
            triggerEl,
            floatingEl,
            updateFloatingPosition,
          )
        }
      }
      const items = getFocusableItems()
      items[0]?.focus()
    })
  } else {
    stopFloating()
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
  const target = e.target as Node
  if (container.value?.contains(target)) return
  if (contentEl.value?.contains(target)) return
  close()
}

onBlokkliEvent('mouse:up', close)

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  stopFloating()
})

defineExpose({ close })
</script>

<style lang="postcss">
.bk {
  .bk-dropdown-menu-trigger {
    @apply appearance-none;
  }

  .bk-dropdown-menu-content {
    @apply absolute z-50;
    @apply bg-white border border-mono-300 shadow-lg;
    @apply pointer-events-auto;

    hr {
      @apply border-t-mono-300;
    }

    &.bk-is-bottom-left {
      @apply bottom-full left-0 mb-5;
    }

    &.bk-is-top-left {
      @apply top-full left-0 mt-5;
    }

    &.bk-is-top-right {
      @apply top-full right-0 mt-5;
    }

    &.bk-origin-bottom-left {
      @apply origin-bottom-left;
    }

    &.bk-origin-top-left {
      @apply origin-top-left;
    }

    &.bk-origin-top-right {
      @apply origin-top-right;
    }
  }
}
</style>
