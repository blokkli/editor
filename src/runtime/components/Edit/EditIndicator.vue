<template>
  <Teleport to="body">
    <div v-show="isVisible" class="pb">
      <div class="bk-edit-indicator" :style="style">
        <button
          ref="button"
          class="bk-button bk-is-primary"
          @click="$emit('edit')"
        >
          {{ label }}
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import textProvider from '#blokkli/helpers/textProvider'
import { ref, computed } from '#imports'
import '#blokkli/theme'
import '#blokkli/styles'
import useAnimationFrame from '#blokkli/helpers/composables/useAnimationFrame'

const props = defineProps<{
  uuid: string
  editLabel?: string
}>()

const $t = textProvider()

const label = computed(
  () => props.editLabel || $t('editIndicatorLabel', 'Edit blocks'),
)

defineEmits(['edit'])

const style = ref<Record<string, string>>({})
const button = ref<HTMLButtonElement | null>(null)
const isVisible = ref(false)

useAnimationFrame(() => {
  const el = document.querySelector(`[data-provider-uuid="${props.uuid}"]`)
  isVisible.value = window.innerWidth > 1024
  if (isVisible.value && el && el instanceof HTMLElement && button.value) {
    const rect = el.getBoundingClientRect()
    const buttonHeight = button.value.getBoundingClientRect().height
    const y = Math.max(
      Math.min(rect.top + 10, window.innerHeight - buttonHeight - 10),
      10,
    )
    style.value.transform = `translateY(${y}px)`
  }
})
</script>

<style lang="postcss"></style>
