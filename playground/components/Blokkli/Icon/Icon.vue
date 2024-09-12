<template>
  <div
    v-if="icon"
    class="hero-animation-icon bg-white rounded-full overflow-hidden p-15 shadow-lg"
    :style="style"
  >
    <SpriteSymbol :name="icon" class="h-full w-full fill-mono-700" />
  </div>
</template>

<script lang="ts" setup>
import { computed, defineBlokkli, inject, type Ref } from '#imports'
import type { NuxtSvgSpriteSymbol } from '#nuxt-svg-sprite/runtime'

type Props = {
  icon: NuxtSvgSpriteSymbol
}

const step = inject<Ref<number>>('hero_step')!

const { index, isEditing } = defineBlokkli({
  bundle: 'icon',
})

const style = computed(() => {
  if (isEditing) {
    return
  }
  const x = Math.sin(index.value) * 30
  const y =
    Math.cos(index.value + (index.value % 8) + step.value / 500) * 30 -
    50 +
    step.value / 1
  const scale =
    (1.5 + Math.sin(index.value + (index.value % 5) + step.value / 200)) / 4 +
    0.3

  const z = -500 + scale * 700
  const rotation = Math.sin(index.value + step.value / 150) * 10

  return {
    transform: `translateZ(${z}px) translate(${x}px, ${y}px) rotate3d(0, 0, 1, ${rotation}deg)`,
    opacity: 1,
  }
})

defineProps<Props>()
</script>
