<template>
  <div
    class="bk-form-overlay bk-vars"
    @click.stop
    @mousedown.stop
    @keyup.stop
    @keydown.stop
  >
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
import type { BlokkliIcon } from '#blokkli-build/icons'
import { Resizable } from '#blokkli/editor/components'
import { onBeforeUnmount, onMounted, useBlokkli } from '#imports'
import { onBlokkliEvent } from '#blokkli/editor/composables'

const props = defineProps<{
  id: string
  bundle?: string
  icon?: BlokkliIcon
  title: string
}>()

const { ui } = useBlokkli()

const emit = defineEmits<{
  (e: 'close'): void
}>()

function onClose() {
  emit('close')
}

onBlokkliEvent('overlay:close', onClose)

onMounted(() => {
  ui.openDialog({ id: props.id, alignment: 'right', confirmClose: true })
})

onBeforeUnmount(() => {
  ui.closeDialog(props.id)
})
</script>

<script lang="ts">
export default {
  name: 'FormOverlay',
}
</script>

<style lang="postcss">
.bk.bk-form-overlay-footer {
  @apply p-20 bg-white border-t sticky bottom-0 z-50 flex gap-20;
  .bk-button {
    @apply w-full;
  }
}

.bk-vars .bk-form-overlay-content {
  @apply flex-1 relative overscroll-contain overflow-auto rounded-t-xl bg-white md:rounded-t-none;
  container-type: inline-size;
}

.bk-vars.bk-form-overlay {
  @apply absolute left-0 top-0 w-full h-full z-form-overlay pointer-events-none;
  .bk-form-overlay-resizable {
    @apply ml-auto h-full shadow-2xl bg-mono-950 pointer-events-auto;
  }
  .bk-resizable-inner {
    @apply h-full flex flex-col;
  }
}
</style>
