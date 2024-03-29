<template>
  <PluginViewOption
    id="mask"
    v-model="isActive"
    :label="$t('maskToggle', 'Show editable areas')"
    :title-on="$t('maskShow', 'Show editable areas')"
    :title-off="$t('maskHide', 'Hide non-editable areas')"
    :tour-text="
      $t(
        'maskTourText',
        'Toggle between showing or hiding non-editable parts of the page.',
      )
    "
    icon="texturebox"
    key-code="M"
  />
</template>

<script lang="ts" setup>
import {
  useBlokkli,
  defineBlokkliFeature,
  ref,
  watch,
  onMounted,
  onBeforeUnmount,
} from '#imports'
import { PluginViewOption } from '#blokkli/plugins'

defineBlokkliFeature({
  id: 'editable-mask',
  icon: 'texturebox',
  label: 'Editable Mask',
  description: 'Provides a view option to hide non-editable parts of the page.',
  viewports: ['desktop'],
})

const { $t } = useBlokkli()

const isActive = ref(false)

const setRootClass = () => {
  console.log({ isActive: isActive.value })
  document.documentElement.classList.remove('bk-hide-non-editable')
  if (isActive.value) {
    document.documentElement.classList.add('bk-hide-non-editable')
  }
}

watch(isActive, setRootClass)

onMounted(setRootClass)

onBeforeUnmount(() => {
  document.documentElement.classList.remove('bk-hide-non-editable')
})
</script>

<script lang="ts">
export default {
  name: 'EditableMask',
}
</script>
