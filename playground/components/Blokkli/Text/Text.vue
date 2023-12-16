<template>
  <div :class="{ 'container mx-auto my-20': !parentType }">
    <div
      v-blokkli-editable:text
      class="content"
      :class="{ 'is-inverted': isInverted }"
      v-html="markup"
    />
  </div>
</template>

<script lang="ts" setup>
const { parentType, options } = defineBlokkli({
  bundle: 'text',
  options: {
    list: {
      type: 'checkbox',
      label: 'List',
      default: '0',
    },
  },
  editTitle: (el) => el.innerText,
})

const props = defineProps<{
  text: string
}>()

const injectedInverted = inject<ComputedRef<boolean> | null>('isInverted', null)
const isInverted = computed(() => !!injectedInverted?.value)

const markup = computed((v) => {
  const text = props.text
  if (options.value.list === '1') {
    return (
      '<ul>' +
      text
        .split('\n')
        .map((v) => `<li>${v}</li>`)
        .join('\n') +
      '</ul>'
    )
  }
  return text
})
</script>

<style lang="postcss">
.content {
  &.is-inverted {
    @apply text-slate-200;
  }
  ul {
    li {
      @apply font-medium;
      &:before {
        content: '';
        @apply inline-block w-[16px] h-[16px] rounded-full bg-blue-700 mr-10 align-middle overflow-hidden;
        background-image: url(/check.svg);
        background-size: 60% 60%;
        background-position: center center;
        background-repeat: no-repeat;
      }
      &:not(:last-child) {
        @apply mb-10;
      }
    }
  }
}
</style>
