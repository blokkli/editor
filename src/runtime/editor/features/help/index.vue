<template>
  <Teleport :to="ui.mainLayoutElement.value">
    <BlokkliTransition name="slide-up">
      <HelpDialog v-if="showDialog" @cancel="onClose" />
    </BlokkliTransition>
  </Teleport>
</template>

<script lang="ts" setup>
import {
  useBlokkli,
  defineBlokkliFeature,
  computed,
  defineAsyncComponent,
} from '#imports'
import { BlokkliTransition } from '#blokkli/editor/components'
import {
  defineMenuButton,
  defineShortcut,
  onBlokkliEvent,
} from '#blokkli/editor/composables'

const HelpDialog = defineAsyncComponent(() => import('./Dialog/index.vue'))

defineBlokkliFeature({
  id: 'help',
  icon: 'bk_mdi_help',
  label: 'Help',
  description:
    'Provides a menu button to display a dialog with shortcuts and a link to the editor tour.',
  viewports: ['desktop'],
})

const { $t, ui } = useBlokkli()

const showDialog = computed(() => ui.currentDialog.value?.id === 'help')

function onOpen() {
  ui.openDialog({ id: 'help', alignment: 'center' })
}

function onClose() {
  ui.closeDialog('help')
}

defineMenuButton(() => {
  return {
    id: 'help',
    title: $t('featureHelpTitle', 'Help'),
    description: $t('helpMenuDescription', 'View available keyboard shortcuts'),
    icon: 'bk_mdi_help',
    secondary: true,
    callback: onOpen,
  }
})

defineShortcut({
  code: 'F1',
  label: $t('featureHelpTitle', 'Help'),
})

onBlokkliEvent('keyPressed', (e) => {
  if (e.code !== 'F1') {
    return
  }
  if (ui.hasNestedEditorOpen.value) {
    return
  }
  if (ui.hasDialogOpen.value && !showDialog.value) {
    return
  }
  e.originalEvent.preventDefault()
  if (showDialog.value) {
    onClose()
  } else {
    onOpen()
  }
})
</script>

<script lang="ts">
export default {
  name: 'Help',
}
</script>
