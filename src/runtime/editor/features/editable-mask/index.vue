<template>
  <div />
</template>

<script lang="ts" setup>
import { useBlokkli, defineBlokkliFeature } from '#imports'
import {
  addElementClasses,
  defineViewOption,
} from '#blokkli/editor/composables'

defineBlokkliFeature({
  id: 'editable-mask',
  icon: 'bk_mdi_texture',
  label: 'Editable Mask',
  description: 'Provides a view option to hide non-editable parts of the page.',
  viewports: ['desktop'],
})

const { $t } = useBlokkli()

const { isVisible } = defineViewOption({
  id: 'mask',
  label: $t('viewOptionNonEditableAreas', 'Only editable areas'),
  description: $t(
    'viewOptionNonEditableAreasDescription',
    'Hides parts of the page that cannot be edited.',
  ),
  tourText: $t(
    'maskTourText',
    'Toggle between showing or hiding non-editable parts of the page.',
  ),
  icon: 'bk_mdi_texture',
  keyCode: 'M',
})

addElementClasses(document.documentElement, 'bk-hide-non-editable', isVisible)
</script>

<script lang="ts">
export default {
  name: 'EditableMask',
}
</script>

<style lang="postcss">
html.bk-hide-non-editable {
  .bk-main-canvas {
    > * {
      @apply invisible;
    }

    [data-blokkli-provider-active='true'] {
      @apply visible;
    }
  }
}
</style>
