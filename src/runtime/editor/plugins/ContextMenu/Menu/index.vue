<template>
  <div
    class="bk bk-context-menu fixed z-context-menu pointer-events-auto"
    :style="{ left: x + 'px', top: y + 'px' }"
  >
    <div
      ref="rootEl"
      class="bk-context-menu-inner absolute bg-mono-950 text-mono-100 shadow-xl-even border border-mono-600 rounded overflow-hidden"
      :style="innerStyle"
    >
      <div v-for="(item, i) in menu" :key="i">
        <hr v-if="item.type === 'rule'" />
        <button
          v-else-if="item.type === 'button'"
          class="px-15 py-15 whitespace-nowrap text-left flex items-center gap-10 font-sans font-semibold hover:bg-mono-800"
          @click="onClick(i)"
        >
          <Icon :name="item.icon" />
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
  const horizontal =
    props.x - 300 >
    ui.visibleViewportPadded.value.x + ui.visibleViewportPadded.value.width
      ? { right: 0 }
      : { left: 0 }

  const vertical =
    props.y + 300 >
    ui.visibleViewportPadded.value.y + ui.visibleViewportPadded.value.height
      ? { bottom: 0 }
      : { top: 0 }

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

const onClick = (index: number) => {
  const item = props.menu[index]
  if (item && item.type === 'button') {
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

<style lang="postcss">
.bk-context-menu-inner button {
  .bk-icon svg {
    @apply w-25 h-25 fill-current;
  }
}
</style>
