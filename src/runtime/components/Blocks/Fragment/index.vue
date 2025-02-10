<template>
  <component :is="component" v-if="component" />
</template>

<script lang="ts" setup>
import { getBlokkliFragmentComponent } from '#blokkli-build/imports'
import { provide, defineBlokkli } from '#imports'
import { INJECT_FRAGMENT_CONTEXT } from '#blokkli/helpers/symbols'
import type { BlokkliFragmentName } from '#blokkli-build/definitions'

export type Props = {
  name: BlokkliFragmentName
}

const componentProps = defineProps<Props>()

const ctx = defineBlokkli({
  bundle: 'blokkli_fragment',
  editor: {
    disableEdit: true,
  },
})

const component = getBlokkliFragmentComponent(componentProps.name)

provide(INJECT_FRAGMENT_CONTEXT, ctx)
</script>
