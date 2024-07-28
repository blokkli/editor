<template>
  <div
    class="bk-form-overlay"
    @click.stop
    @mousedown.stop
    @keyup.stop
    @keydown.stop
  >
    <div class="bk bk-form-overlay-background bk-overlay" />
    <Resizable :id="id" class="bk-form-overlay-resizable">
      <FormHeader
        :bundle="bundle"
        :icon="icon"
        :title="title"
        @close="onClose"
      />
      <div class="bk-form-overlay-content">
        <slot />
      </div>
      <div v-if="$slots.footer" class="bk bk-form-overlay-footer">
        <slot name="footer" />
      </div>
    </Resizable>
  </div>
</template>

<script lang="ts" setup>
import FormHeader from './Header/index.vue'
import type { BlokkliIcon } from '#blokkli/icons'
import { Resizable } from '#blokkli/components'

defineProps<{
  id: string
  bundle?: string
  icon?: BlokkliIcon
  title: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const onClose = () => {
  emit('close')
}
</script>

<script lang="ts">
export default {
  name: 'FormOverlay',
}
</script>
