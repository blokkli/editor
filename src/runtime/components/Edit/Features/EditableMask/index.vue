<template>
  <PluginViewOption
    id="mask"
    :title-on="$t('maskShow')"
    :title-off="$t('maskHide')"
    key-code="M"
  >
    <template #icon>
      <Icon name="texturebox" />
    </template>

    <template #default="{ isActive }">
      <Teleport to="body">
        <Overlay v-if="isActive" />
      </Teleport>
    </template>
  </PluginViewOption>
</template>

<script lang="ts" setup>
import { useBlokkli, defineBlokkliFeature } from '#imports'
import { PluginViewOption } from '#blokkli/plugins'
import { Icon } from '#blokkli/components'
import Overlay from './Overlay/index.vue'

defineBlokkliFeature({
  id: 'editable-mask',
  description: 'Provides a view option to hide non-editable parts of the page.',
})

const { $t } = useBlokkli()
</script>

<script lang="ts">
export default {
  name: 'EditableMask',
}
</script>
