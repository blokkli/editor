<template>
  <Teleport :to="ui.mainLayoutElement.value">
    <BlokkliTransition name="slide-up">
      <ChangelogDialog v-if="showDialog" @cancel="onClose" />
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
import { blokkliVersion } from '#blokkli-build/editor-config'
import { BlokkliTransition } from '#blokkli/editor/components'
import { defineMenuButton } from '#blokkli/editor/composables'

const ChangelogDialog = defineAsyncComponent(() => import('./Dialog/index.vue'))

const { ui, storage, $t } = useBlokkli()

defineBlokkliFeature({
  id: 'changelog',
  label: 'Changelog',
  icon: 'bk_mdi_campaign',
  description: "Provides a menu button to display a changelog of what's new.",
})

const lastSeenVersion = storage.use('changelog:lastSeenVersion', '')

const hasNew = computed(() => lastSeenVersion.value !== blokkliVersion)

const showDialog = computed(() => ui.currentDialog.value?.id === 'changelog')

function onClick() {
  lastSeenVersion.value = blokkliVersion
  ui.openDialog({ id: 'changelog', alignment: 'center' })
}

function onClose() {
  ui.closeDialog('changelog')
}

defineMenuButton(() => {
  return {
    id: 'changelog',
    title: $t('changelogMenuTitle', "What's New"),
    description: $t(
      'changelogMenuDescription',
      'View recent changes and new features',
    ),
    icon: 'bk_mdi_campaign',
    secondary: true,
    weight: -10,
    type: hasNew.value ? 'yellow' : undefined,
    callback: onClick,
  }
})
</script>

<script lang="ts">
export default {
  name: 'Changelog',
}
</script>
