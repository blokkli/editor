<template>
  <DebugMain v-if="debug.isEnabled.value" :logger />
</template>

<script lang="ts" setup>
import { defineBlokkliFeature, useBlokkli } from '#imports'
import DebugMain from './Main.vue'
import { onBlokkliEvent } from '#blokkli/editor/composables'

const { logger } = defineBlokkliFeature({
  id: 'debug',
  label: 'Debug',
  icon: 'bk_mdi_bug_report',
  description: 'Provides debugging functionality.',
})

const { debug, ui } = useBlokkli()

onBlokkliEvent('keyPressed', (e) => {
  if (ui.hasDialogOpen.value || ui.hasNestedEditorOpen.value) {
    return
  }

  if (e.code === '=' && e.meta) {
    e.originalEvent.preventDefault()
    debug.toggle()
  }
})
</script>

<script lang="ts">
export default {
  name: 'Debug',
}
</script>
