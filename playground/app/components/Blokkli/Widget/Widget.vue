<template>
  <div class="container">This should never be rendered!</div>
</template>

<script lang="ts" setup>
import { defineBlokkli } from '#imports'

defineBlokkli({
  bundle: 'widget',
  globalOptions: ['background', 'bkVisibleLanguages'],
  chunkName: 'rare',
  editor: {
    icon: 'bk_mdi_widgets',
  },
})

export type Props = object
</script>
