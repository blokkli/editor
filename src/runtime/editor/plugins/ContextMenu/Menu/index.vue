<template>
  <div
    class="bk bk-context-menu fixed z-context-menu pointer-events-auto"
    :style="{ left: x + 'px', top: y + 'px' }"
  >
    <div
      ref="rootEl"
      class="bk-context-menu-inner absolute bg-mono-950 text-mono-100 shadow-xl-even border border-mono-600 overflow-hidden min-w-200"
      :style="innerStyle"
    >
      <div v-for="(item, i) in menu" :key="i">
        <hr v-if="item.type === 'rule'" class="border-t-mono-600" />
        <button
          v-else-if="item.type === 'button'"
          class="p-10 whitespace-nowrap text-left flex items-center gap-5 font-sans font-semibold hover:bg-mono-800 w-full text-base text-mono-300 hover:text-mono-50"
          @click="onClick(i)"
        >
          <Icon :name="item.icon" class="size-20" />
          <span>{{ item.label }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { ContextMenu } from '#blokkli/editor/types/ui'
import { Icon } from '#blokkli/editor/components'
import { onBlokkliEvent } from '#blokkli/editor/composables'
import {
  watch,
  ref,
  computed,
  onMounted,
  useBlokkli,
  onBeforeUnmount,
} from '#imports'

const props = defineProps<{
  menu: ContextMenu[]
  x: number
  y: number
}>()

const emit = defineEmits(['close'])

const { ui, selection } = useBlokkli()

const rootEl = ref<HTMLDivElement | null>(null)

const innerStyle = computed(() => {
  const vp = ui.visibleViewportPadded.value
  const vpRight = vp.x + vp.width
  const vpBottom = vp.y + vp.height

  const horizontal = props.x + 300 > vpRight ? { right: 0 } : { left: 0 }
  const vertical = props.y + 300 > vpBottom ? { bottom: 0 } : { top: 0 }

  return {
    ...horizontal,
    ...vertical,
  }
})

onBlokkliEvent('keyPressed', (e) => {
  if (ui.hasDialogOpen.value) {
    return
  }

  if (e.code === 'Escape') {
    emit('close')
  }
})

onBlokkliEvent('window:clickAway', () => {
  emit('close')
})

watch(selection.uuids, () => emit('close'))

const onClick = async (index: number) => {
  const item = props.menu[index]
  if (item && item.type === 'button') {
    // Persist any pending option changes before running the action.
    await ui.flushPendingChanges()
    item.callback()
  }
  emit('close')
}

const onMouseDown = (e: MouseEvent) => {
  if (!rootEl.value) {
    return
  }

  if (
    (e.target instanceof HTMLElement || e.target instanceof SVGElement) &&
    !e.target.contains(rootEl.value)
  ) {
    emit('close')
  }
}

onMounted(() => {
  window.addEventListener('click', onMouseDown)
})

onBeforeUnmount(() => {
  window.removeEventListener('click', onMouseDown)
})
</script>
