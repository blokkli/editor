<template>
  <div class="pb pb-field-areas">
    <div
      v-for="area in areas"
      class="pb-field-area"
      :style="area.style"
      :class="{ 'pb-is-active': area.key === activeFieldKey }"
      @click="$emit('select', area.key)"
    >
      <div>
        <span>{{ area.label }}</span>
      </div>
    </div>
  </div>
  <div v-if="maskVisible" class="pb-canvas-area" :style="canvasAreaStyle">
    <div
      v-for="area in canvasFieldAreas"
      :style="area.style"
      :class="{ 'pb-is-active': area.active }"
    ></div>
  </div>
</template>

<script lang="ts" setup>
import { eventBus } from '../eventBus'
import { AnimationFrameEvent } from '../types'

const { maskVisible } = useParagraphsBuilderStore()

defineEmits<{
  (e: 'select', key: string): void
}>()

const props = defineProps<{
  activeFieldKey: string
}>()

export type FieldArea = {
  key: string
  name: string
  label: string
  style: {
    transform: string
  }
}

type CanvasFieldArea = {
  style: Record<string, string>
  active: boolean
}

const areas = ref<FieldArea[]>([])
const canvasArea = ref<DOMRect | null>(null)
const canvasFieldAreas = ref<CanvasFieldArea[]>([])

const canvasAreaStyle = computed(() => {
  if (!canvasArea.value) {
    return
  }
  return {
    width: canvasArea.value.width + 'px',
    height: canvasArea.value.height + 'px',
    transform: `translate(${canvasArea.value.x}px, ${canvasArea.value.y}px)`,
  }
})

function onAnimationFrame(e: AnimationFrameEvent) {
  if (maskVisible.value) {
    canvasFieldAreas.value = e.fieldAreas
      .filter((v) => !v.isNested)
      .map((v) => {
        return {
          style: {
            width: v.rect.width + 'px',
            height: v.rect.height + 'px',
            top: v.rect.top - e.canvasRect.top + 'px',
            left: v.rect.left - e.canvasRect.left + 'px',
          },
          active: v.key === props.activeFieldKey,
        }
      })

    canvasArea.value = e.canvasRect
  }

  areas.value = e.fieldAreas
    .filter((v) => {
      return v.isVisible && (!v.isNested || v.key === props.activeFieldKey)
    })
    .map((v) => {
      return {
        key: v.key,
        name: v.name,
        label: v.label,
        style: {
          transform: `translate(${Math.round(
            v.isNested ? v.rect.x : e.canvasRect.x,
          )}px, ${Math.round(
            Math.max(v.rect.y, Math.min(80, v.rect.height + v.rect.y - 20)),
          )}px)`,
        },
      }
    })
}

onMounted(() => {
  eventBus.on('animationFrame', onAnimationFrame)
})

onBeforeUnmount(() => {
  eventBus.off('animationFrame', onAnimationFrame)
})
</script>
