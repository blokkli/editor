<template>
  <Banner
    id="ownership"
    data-test="ownership-banner"
    :data-test-owner-name="state.owner.value?.name ?? ''"
  >
    <BannerInner
      icon="bk_mdi_person-fill"
      :text
      :button
      @click="$emit('submit')"
    />
  </Banner>
</template>

<script setup lang="ts">
import { computed, useBlokkli, onMounted, onBeforeUnmount } from '#imports'
import { Banner, BannerInner } from '#blokkli/editor/components'

const props = defineProps<{
  canTakeOwnership: boolean
}>()

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

const button = computed<string | undefined>(() => {
  if (!props.canTakeOwnership) {
    return undefined
  }

  return $t('ownershipTakeOwnership', 'Assign to me')
})

onMounted(() => {
  ui.setSelectionColor('ownership', 'mono')
})

onBeforeUnmount(() => {
  ui.removeSelectionColor('ownership')
})
</script>
