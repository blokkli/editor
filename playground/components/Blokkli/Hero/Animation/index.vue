<template>
  <div class="relative hero-animation">
    <div
      v-for="(icon, i) in icons"
      :key="icon"
      class="bg-white aspect-square rounded-lg overflow-hidden p-15 shadow-lg"
      :style="getIconStyle(i)"
    >
      <SpriteSymbol :name="icon" class="h-full w-full fill-slate-700" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { NuxtSvgSpriteSymbol } from '#nuxt-svg-sprite'

const props = defineProps<{
  animated: boolean
}>()

let raf: any = null
const step = ref(0)
const isMobile = ref(false)
const icons: NuxtSvgSpriteSymbol[] = [
  'title',
  'clipboard',
  'button',
  'image',
  'heading',
  'zoom',
  'palette',
  'edit',
  'adapter',
]

const getIconStyle = (index: number) => {
  if (isMobile.value) {
    return {
      transform: `rotateZ(${
        Math.sin(2 + index + (index % 3) + step.value / 200) * 20
      }deg) translateZ(${-100 + Math.cos(index + step.value / 200) * 200}px)`,
    }
  }
  const x = Math.sin(index) * 30
  const y =
    Math.cos(index + (index % 8) + step.value / 500) * 30 - 50 + step.value / 1
  const scale =
    (1.5 + Math.sin(index + (index % 5) + step.value / 200)) / 4 + 0.3

  const z = -500 + scale * 700
  const rotation = Math.sin(index + step.value / 150) * 10

  return {
    transform: `translateZ(${z}px) translate(${x}px, ${y}px) rotate3d(0, 0, 1, ${rotation}deg)`,
    opacity: 1,
  }
}

const loop = () => {
  step.value = window.scrollY
  isMobile.value = window.innerWidth < 768
  if (props.animated) {
    raf = window.requestAnimationFrame(loop)
  }
}

onMounted(() => {
  if (props.animated) {
    loop()
  }
})

onBeforeUnmount(() => {
  window.cancelAnimationFrame(raf)
})
</script>

<style lang="postcss">
.hero-animation {
  perspective: 1200px;
  transform-style: preserve-3d;
  @apply inline-grid grid-cols-3 gap-40;
  @screen lg {
    perspective: 700px;
  }
}
</style>
