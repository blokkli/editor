<template>
  <Teleport :to="ui.mainLayoutElement.value">
    <BlokkliTransition name="slide-up">
      <ChangelogDialog v-if="showDialog" @cancel="onClose" />
    </BlokkliTransition>
  </Teleport>
</template>

<script lang="ts" setup>
import { useBlokkli, defineBlokkliFeature, computed } from '#imports'
import ChangelogDialog from './Dialog/index.vue'
import { BlokkliTransition } from '#blokkli/editor/components'
import { defineMenuButton } from '#blokkli/editor/composables'
import data from './changelog.json'

const { ui, storage, $t } = useBlokkli()

defineBlokkliFeature({
  id: 'changelog',
  label: 'Changelog',
  icon: 'bk_mdi_campaign',
  description: "Provides a menu button to display a changelog of what's new.",
})

const latestVersion = data[0]?.version ?? ''

const lastSeenVersion = storage.use('changelog:lastSeenVersion', '')

const hasNew = computed(
  () => !!latestVersion && lastSeenVersion.value !== latestVersion,
)

const showDialog = computed(() => ui.currentDialog.value?.id === 'changelog')

function onClick() {
  lastSeenVersion.value = latestVersion
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
