<template>
  <div class="bk bk-field-areas" v-show="!selection.isDragging.value">
    <div
      v-for="area in areas"
      :key="area.key"
      class="bk-field-area"
      :style="area.style"
      :class="{ 'bk-is-active': area.key === selection.activeFieldKey.value }"
      @click="eventBus.emit('setActiveFieldKey', area.key)"
    >
      <div>
        <span>{{ area.label }}</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, useBlokkli, onMounted, onBeforeUnmount } from '#imports'

import type { AnimationFrameEvent } from '#blokkli/types'

const { eventBus, selection } = useBlokkli()

type FieldArea = {
  key: string
  name: string
  label: string
  style: {
    transform: string
  }
}

const areas = ref<FieldArea[]>([])

function onAnimationFrame(e: AnimationFrameEvent) {
  areas.value = e.fieldAreas
    .filter((v) => {
      return (
        v.isVisible && (!v.isNested || v.key === selection.activeFieldKey.value)
      )
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
