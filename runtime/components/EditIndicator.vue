<template>
  <Teleport to="body">
    <div class="pb" v-show="isVisible">
      <div class="pb-field-paragraphs-indicator" :style="style">
        <button
          class="pb-button pb-is-primary"
          ref="button"
          @click="$emit('edit')"
        >
          Abschnitte bearbeiten
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import '#nuxt-paragraphs-builder/styles'

const props = defineProps<{
  uuid: string
}>()

defineEmits(['edit'])

const style = ref<Record<string, string>>({})
const button = ref<HTMLButtonElement | null>(null)
const isVisible = ref(false)

let raf: any = null

function loop() {
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

  raf = window.requestAnimationFrame(loop)
}

onMounted(() => {
  loop()
})

onUnmounted(() => {
  window.cancelAnimationFrame(raf)
})
</script>

<style lang="postcss">
.pb-field-paragraphs-indicator {
  position: fixed;
  top: 0;
  right: 10px;
  z-index: 100;
}
</style>
