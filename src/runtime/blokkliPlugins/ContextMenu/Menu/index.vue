<template>
  <div class="bk bk-context-menu" :style="{ left: x + 'px', top: y + 'px' }">
    <div ref="rootEl" class="bk-context-menu-inner" :style="innerStyle">
      <div v-for="(item, i) in menu" :key="i">
        <hr v-if="item.type === 'rule'" />
        <button v-else-if="item.type === 'button'" @click="onClick(i)">
          <Icon :name="item.icon" />
          <span>{{ item.label }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { ContextMenu } from '#blokkli/types'
import { Icon } from '#blokkli/components'
import {
  watch,
  ref,
  computed,
  onMounted,
  useBlokkli,
  onBeforeUnmount,
} from '#imports'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'

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
  if (e.code === 'Escape') {
    emit('close')
  }
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

  if (e.target instanceof HTMLElement || e.target instanceof SVGElement) {
    if (!e.target.contains(rootEl.value)) {
      emit('close')
    }
  }
}

onMounted(() => {
  window.addEventListener('click', onMouseDown)
})

onBeforeUnmount(() => {
  window.removeEventListener('click', onMouseDown)
})
</script>
