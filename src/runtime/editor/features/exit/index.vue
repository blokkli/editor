<template>
  <div />
</template>

<script lang="ts" setup>
import { useBlokkli, useRoute, nextTick, defineBlokkliFeature } from '#imports'
import { defineMenuButton } from '#blokkli/editor/composables'

defineBlokkliFeature({
  id: 'exit',
  label: 'Exit',
  icon: 'bk_mdi_exit_to_app',
  description: 'Provides a menu button to exit the editor without saving.',
})

const { $t, broadcast, context } = useBlokkli()

const route = useRoute()

function onClick() {
  nextTick(() => {
    broadcast.emit('closeEditor', { uuid: context.value.entityUuid })
    window.location.href = route.path
  })
}

defineMenuButton(() => {
  return {
    id: 'exit',
    title: $t('exitTitle', 'Close'),
    description: $t('exitDescription', 'Close editor without publishing'),
    icon: 'bk_mdi_exit_to_app',
    weight: 100,
    callback: onClick,
  }
})
</script>

<script lang="ts">
export default {
  name: 'Exit',
}
</script>
