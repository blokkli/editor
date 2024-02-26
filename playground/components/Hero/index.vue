<template>
  <div :style="{ '--hero-step': step }">
    <div class="hero py-20 md:py-50 lg:py-100 overflow-hidden relative">
      <div class="container lg:grid grid-cols-12 gap-20 lg:gap-40">
        <div class="col-span-8 hero-content">
          <BlokkliEditable
            v-slot="{ value }"
            :value="titleValue"
            required
            name="title"
          >
            <h1
              class="text-4xl lg:text-6xl hero-title"
              v-html="getTitleMarkup(value)"
            />
          </BlokkliEditable>
          <p
            v-if="lead"
            v-blokkli-editable:lead="{ required: true }"
            class="mt-20 text-lg lg:text-xl text-mono-700"
            v-text="lead"
          />
          <slot></slot>
        </div>
        <div class="col-span-4 max-w-[340px] lg:w-full mx-auto mb-30 lg:mb-0">
          <slot name="animation"></slot>
        </div>
      </div>
    </div>
    <div class="container">
      <div
        v-blokkli-droppable:heroImage="{
          entityType: 'media',
          entityBundles: ['image'],
          cardinality: 1,
        }"
        class="overflow-hidden shadow-xl rounded-lg bg-white"
      >
        <img v-if="image" :src="image.url" :alt="image.alt" />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, provide, ref } from '#imports'

const props = defineProps<{
  isEditing: boolean
  title: string
  lead: string
  image?: {
    url?: string
    alt?: string
  }
}>()

const titleValue = computed(() => props.title.toString())

const getTitleMarkup = (text: string): string => {
  let result = ''
  let dollarCount = 0

  for (let i = 0; i < text.length; i++) {
    if (text[i] === '$') {
      dollarCount++
      if (dollarCount % 2 === 0) {
        result += '</em>'
      } else {
        result += '<em>'
      }
    } else {
      result += text[i]
    }
  }

  return result
}

let raf: any = null
const step = ref(0)
const isMobile = ref(false)

const loop = () => {
  step.value = window.scrollY
  isMobile.value = window.innerWidth < 768
  if (!props.isEditing) {
    raf = window.requestAnimationFrame(loop)
  }
}

onMounted(() => {
  if (!props.isEditing) {
    loop()
  }
})

onBeforeUnmount(() => {
  window.cancelAnimationFrame(raf)
})

provide('hero_step', step)
</script>

<style lang="postcss">
.hero {
  &:after {
    content: '';
    @apply absolute bottom-0 left-0 w-full h-100 bg-gradient-to-b from-white/0 to-white;
  }
  &:before {
    content: '';
    @apply absolute top-0 left-0 w-full h-full z-0;
    @apply bg-gradient-to-b from-accent-50 to-white;
  }
}
.hero-title {
  @apply text-mono-950 font-extrabold;
  em {
    @apply not-italic bg-accent-50 inline-block px-[0.125em] py-[0.125em] text-accent-700 border-2 border-accent-200 border-dashed rounded;
  }
}

.hero-content {
  @apply relative z-10;
}

.hero-animation {
  perspective: 1200px;
  transform-style: preserve-3d;
  @apply inline-grid grid-cols-3 gap-50 w-full mt-[120px] -mb-[50px] md:mt-0 md:mb-0;
  @screen lg {
    perspective: 700px;
  }

  svg {
    @apply w-full h-full leading-none;
  }
}
.hero-animation-icon {
  @apply flex relative w-full items-center justify-center aspect-square;
}
</style>
