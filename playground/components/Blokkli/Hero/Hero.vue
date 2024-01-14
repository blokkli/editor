<template>
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
          class="mt-20 text-lg lg:text-xl text-slate-700"
          v-text="lead"
        />
        <BlokkliField
          name="buttons"
          :list="buttons"
          list-class="mt-20 lg:mt-40 flex gap-10 flex-wrap"
        />
      </div>
      <div class="col-span-4 max-w-[340px] lg:w-full mx-auto mb-30 lg:mb-0">
        <BlokkliHeroAnimation :animated="!isEditing" />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { FieldListItemTyped } from '#blokkli/generated-types'
import { defineBlokkli, computed } from '#imports'

const { isEditing } = defineBlokkli({
  bundle: 'hero',
  editTitle: (el) => el.querySelector('h1')?.innerText,
})

const props = defineProps<{
  title: string
  lead: string
  buttons: FieldListItemTyped[]
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
    @apply bg-gradient-to-b from-blue-50 to-white;
  }
}
.hero-title {
  @apply text-slate-950 font-extrabold;
  em {
    @apply not-italic bg-blue-50 inline-block px-[0.125em] py-[0.125em] text-blue-700 border-2 border-blue-200 border-dashed rounded;
  }
}

.hero-content {
  @apply relative z-10;
}
</style>
