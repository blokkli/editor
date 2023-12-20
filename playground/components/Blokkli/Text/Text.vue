<template>
  <div :class="{ 'container mx-auto my-20': !parentType }">
    <div
      v-blokkli-editable:text="{ type: 'frame' }"
      class="ck-content"
      :class="{ 'is-inverted': isInverted }"
      v-html="text"
    />
  </div>
</template>

<script lang="ts" setup>
const { parentType, options } = defineBlokkli({
  bundle: 'text',
  noAddForm: true,
  editTitle: (el) => el.innerText,
})

defineProps<{
  text: string
}>()

const injectedInverted = inject<ComputedRef<boolean> | null>('isInverted', null)
const isInverted = computed(() => !!injectedInverted?.value)
</script>

<style lang="postcss"></style>
