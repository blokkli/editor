<template>
  <PluginToolbarButton
    id="preview_new_window"
    :title="$t('previewNewWindow', 'Preview (new window)')"
    region="after-menu"
    icon="open_in_new"
    :tour-text="
      $t(
        'previewNewWindowTourText',
        'Opens a preview of the current changes in a new window.',
      )
    "
    @click="openPreview"
  />
</template>

<script lang="ts" setup>
import { computed, useBlokkli, useRoute, defineBlokkliFeature } from '#imports'
import { PluginToolbarButton } from '#blokkli/plugins'

defineBlokkliFeature({
  id: 'preview',
  label: 'Preview',
  icon: 'preview',
  description: 'Provides a button to open a preview in a new window.',
})

const { $t } = useBlokkli()

const route = useRoute()

const previewUrl = computed(() =>
  route.fullPath.replace('blokkliEditing', 'blokkliPreview'),
)

function openPreview() {
  window.open(previewUrl.value)
}
</script>

<script lang="ts">
export default {
  name: 'Preview',
}
</script>
