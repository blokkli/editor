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
import { Resizable } from '#blokkli/components'
import { onBeforeUnmount, onMounted, useBlokkli } from '#imports'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'

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
