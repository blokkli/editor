<template>
  <PluginViewOption
    id="mask"
    v-model="isActive"
    :label="$t('maskToggle', 'Toggle non-editable areas')"
    :title-on="$t('maskHide', 'Hide non-editable areas')"
    :title-off="$t('maskShow', 'Show non-editable areas')"
    :tour-text="
      $t(
        'maskTourText',
        'Toggle between showing or hiding non-editable parts of the page.',
      )
    "
    icon="bk_mdi_texture"
    key-code="M"
  />
</template>

<script lang="ts" setup>
import { useBlokkli, defineBlokkliFeature, ref } from '#imports'
import { PluginViewOption } from '#blokkli/editor/plugins'
import { addElementClasses } from '#blokkli/editor/composables'

defineBlokkliFeature({
  id: 'editable-mask',
  icon: 'bk_mdi_texture',
  label: 'Editable Mask',
  description: 'Provides a view option to hide non-editable parts of the page.',
  viewports: ['desktop'],
})

const { $t } = useBlokkli()

const isActive = ref(false)

addElementClasses(document.documentElement, 'bk-hide-non-editable', isActive)
</script>

<script lang="ts">
export default {
  name: 'EditableMask',
}
</script>
