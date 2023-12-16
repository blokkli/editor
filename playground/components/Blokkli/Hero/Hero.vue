<template>
  <div
    class="hero py-50 md:py-100 lg:py-200 bg-gradient-to-b from-blue-50 to-white overflow-hidden relative"
  >
    <div class="container lg:grid grid-cols-12 gap-20 lg:gap-40">
      <div class="col-span-4 max-w-[340px] lg:w-full mx-auto mb-30 lg:mb-0">
        <BlokkliHeroAnimation :animated="!isEditing" />
      </div>
      <div class="col-span-8 lg:order-first">
        <h1
          class="text-4xl lg:text-6xl hero-title"
          v-html="titleMarkup"
          v-blokkli-editable:title="{ required: true }"
        />
        <p
          v-if="lead"
          v-blokkli-editable:lead="{ required: true }"
          class="mt-20 text-lg lg:text-xl text-slate-700"
        >
          {{ lead }}
        </p>
        <BlokkliField
          v-bind="buttons"
          list-class="mt-20 lg:mt-40 flex gap-10 flex-wrap"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
const { options, isEditing } = defineBlokkli({
  bundle: 'hero',
  options: {
    highlightStart: {
      type: 'text',
      default: '0',
      inputType: 'number',
      label: 'Highlight words',
    },
    highlightLength: {
      type: 'text',
      default: '0',
      inputType: 'number',
      label: 'Highlight length',
    },
  },
  editTitle: (el) => el.querySelector('h1')?.innerText,
})

const props = defineProps<{
  title: string
  lead: string
  buttons: any
}>()

const titleValue = computed(() => props.title.toString())

const titleMarkup = computed(() => {
  const start = parseInt(options.value.highlightStart)
  const length = parseInt(options.value.highlightLength)
  if (isNaN(start) || isNaN(length)) {
    return titleValue.value
  }

  // Split the title into words
  const words = titleValue.value.split(' ')

  // Check if start and length values are within the bounds of the words array
  if (start >= 0 && start < words.length && start + length <= words.length) {
    // Wrap the specified range of words in <em></em> tags
    const highlighted = words.slice(start, start + length).join(' ')
    words.splice(start, length, `<em>${highlighted}</em>`)
  }

  // Join the words back into a string
  return words.join(' ')
})
</script>

<style lang="postcss">
.hero {
  &:after {
    content: '';
    @apply absolute bottom-0 left-0 w-full h-100 bg-gradient-to-b from-white/0 to-white;
  }
}
.hero-title {
  @apply text-slate-950 font-extrabold;
  em {
    @apply not-italic bg-blue-50 inline-block px-[0.125em] py-[0.125em] text-blue-700 border-2 border-blue-200 border-dashed rounded;
  }
}
</style>
