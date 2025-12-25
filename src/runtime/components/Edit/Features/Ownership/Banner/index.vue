<template>
  <Banner
    id="ownership"
    icon="bk_mdi_person-fill"
    :text
    :button="$t('ownershipTakeOwnership', 'Assign to me')"
    @click="$emit('submit')"
  />
</template>

<script setup lang="ts">
import { computed, useBlokkli, onMounted, onBeforeUnmount } from '#imports'
import { Banner } from '#blokkli/components'

defineEmits<{
  (e: 'submit'): void
}>()

const { state, $t, ui } = useBlokkli()

const name = computed(() => {
  const v = state.owner.value?.name
  if (v) {
    return `<strong>${v}</strong>`
  }

  return ''
})

const text = computed(() => {
  return $t(
    'ownershipNote',
    'This page is currently being edited by @name. Changes can only be made by one person at a time.',
  ).replace('@name', name.value)
})

onMounted(() => {
  ui.setSelectionColor('ownership', 'mono')
})

onBeforeUnmount(() => {
  ui.removeSelectionColor('ownership')
})
</script>
