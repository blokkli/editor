<template>
  <PluginToolbarButton
    :title="$t('previewNewWindow', 'Preview (new window)')"
    region="after-menu"
    icon="openinnew"
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
