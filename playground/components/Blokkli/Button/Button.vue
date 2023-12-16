<template>
  <div class="inline-block">
    <NuxtLink
      :to="href"
      class="button"
      :class="{ 'is-primary': options.color === 'primary' }"
    >
      <span v-blokkli-editable:title="{ label: 'CTA' }">{{ title }}</span>
    </NuxtLink>
  </div>
</template>

<script lang="ts" setup>
const { options } = defineBlokkli({
  bundle: 'button',
  noAddForm: true,
  options: {
    color: {
      type: 'radios',
      label: 'Color',
      default: 'white',
      displayAs: 'colors',
      options: {
        normal: 'bg-white',
        primary: 'bg-blue-700',
      },
    },
  },
  editTitle: (el) => el.querySelector('a')?.innerText,
})

const props = defineProps<{
  url: string
  title: string
}>()

const href = computed(() => props.url)
</script>
