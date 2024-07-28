<template>
  <PluginViewOption
    id="mask"
    v-model="isActive"
    :label="$t('maskToggle', 'Toggle non-editable areas')"
    :title-on="$t('maskShow', 'Show non-editable areas')"
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

const HIDE_CLASS = 'bk-hide-non-editable'

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
  document.documentElement.classList.remove(HIDE_CLASS)
  if (isActive.value) {
    document.documentElement.classList.add(HIDE_CLASS)
  }
}

watch(isActive, setRootClass)

onMounted(setRootClass)

onBeforeUnmount(() => {
  document.documentElement.classList.remove(HIDE_CLASS)
})
</script>

<script lang="ts">
export default {
  name: 'EditableMask',
}
</script>
