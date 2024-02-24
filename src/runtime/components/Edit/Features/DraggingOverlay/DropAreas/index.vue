<template>
  <Teleport to="body">
    <div class="bk bk-drop-areas">
      <div
        v-for="rect in rects"
        :key="rect.id"
        :style="rect.style"
        :class="{ 'bk-is-active': rect.active }"
        @click="handleDrop(rect.id)"
      >
        <div>
          <Icon v-if="rect.icon" :name="rect.icon" />
          <div>{{ rect.label }}</div>
        </div>
      </div>
    </div>
  </Teleport>
  <slot :is-active="isActive"></slot>
</template>

<script lang="ts" setup>
import { getDraggableStyle, isInsideRect } from '#blokkli/helpers'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import { Icon } from '#blokkli/components'
import type { BlokkliIcon } from '#blokkli/icons'
import type { DraggableItem } from '#blokkli/types'
import { useBlokkli, ref, onMounted, onBeforeUnmount } from '#imports'

const props = defineProps<{
  items: DraggableItem[]
  isTouch: boolean
  x: number
  y: number
}>()

const { dropAreas, theme, eventBus } = useBlokkli()

const areas = dropAreas.getDropAreas(props.items).map((area) => {
  const style = getDraggableStyle(area.element, theme.teal.value.normal)
  return {
    ...area,
    radius: style.radiusString,
  }
})

type DropAreaRect = {
  id: string
  label: string
  icon?: BlokkliIcon
  active: boolean
  style: Record<string, string>
}

const rects = ref<DropAreaRect[]>([])

const isActive = ref(false)

onBlokkliEvent('animationFrame', () => {
  if (!areas.length) {
    return
  }

  const newRects: DropAreaRect[] = []
  let hasActive = false

  for (let i = 0; i < areas.length; i++) {
    const area = areas[i]
    const rect = area.element.getBoundingClientRect()
    const isInside = !props.isTouch && isInsideRect(props.x, props.y, rect)
    if (isInside) {
      hasActive = true
    }
    newRects.push({
      id: area.id,
      label: area.label,
      icon: area.icon,
      active: isInside,
      style: {
        borderRadius: area.radius,
        width: rect.width + 'px',
        height: rect.height + 'px',
        transform: `translate(${rect.x}px, ${rect.y}px)`,
      },
    })
  }

  rects.value = newRects
  isActive.value = hasActive
})

const handleDrop = async (id: string) => {
  const dropArea = areas.find((v) => v.id === id)
  if (!dropArea) {
    return
  }
  await dropArea.onDrop()
  eventBus.emit('dragging:end')
  eventBus.emit('item:dropped')
}

const onMouseUp = () => {
  const active = rects.value.find((v) => v.active)
  if (!active) {
    return
  }

  handleDrop(active.id)
}

onMounted(() => {
  if (!props.isTouch) {
    document.body.addEventListener('mouseup', onMouseUp)
  }
})

onBeforeUnmount(() => {
  document.body.removeEventListener('mouseup', onMouseUp)
})
</script>
