<template>
  <component :is="component" v-if="component" />
</template>

<script lang="ts" setup>
import { getComponent } from '#blokkli/helpers/imports'
import { provide, defineBlokkli, inject } from '#imports'
import { INJECT_ALL_COMPONENTS_CHUNK, INJECT_FRAGMENT_CONTEXT } from '#blokkli/helpers/injections'
import type { BlokkliFragmentName } from '#blokkli-build/definitions'

export type Props = {
  name: BlokkliFragmentName
}

const componentProps = defineProps<Props>()

const ctx = defineBlokkli({
  bundle: 'BK_BUNDLE_FRAGMENT',
  editor: {
    icon: 'bk_mdi_newspaper',
    disableEdit: true,
  },
})

const allComponentsChunk = inject(INJECT_ALL_COMPONENTS_CHUNK, null)
const component = getComponent('fragment', componentProps.name, undefined, undefined, allComponentsChunk)

provide(INJECT_FRAGMENT_CONTEXT, ctx)
</script>
