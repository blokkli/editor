<template>
  <Teleport to="body">
    <div class="bk bk-drop-areas">
      <div
        v-for="rect in rects"
        :key="rect.id"
        :style="rect.style"
        :class="{ 'bk-is-active': rect.active }"
      >
        <div>
          <Icon v-if="rect.icon" :name="rect.icon" />
          <div>{{ rect.label }}</div>
        </div>
      </div>
    </div>
  </Teleport>
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

const { dropAreas, theme } = useBlokkli()

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

onBlokkliEvent('animationFrame', () => {
  if (!areas.length) {
    return
  }

  rects.value = areas.map((v) => {
    const rect = v.element.getBoundingClientRect()
    return {
      id: v.id,
      label: v.label,
      icon: v.icon,
      active: isInsideRect(props.x, props.y, rect),
      style: {
        borderRadius: v.radius,
        width: rect.width + 'px',
        height: rect.height + 'px',
        transform: `translate(${rect.x}px, ${rect.y}px)`,
      },
    }
  })
})

const onMouseUp = () => {
  const active = rects.value.find((v) => v.active)
  if (!active) {
    return
  }

  const dropArea = areas.find((v) => v.id === active.id)
  if (!dropArea) {
    return
  }

  dropArea.onDrop()
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
