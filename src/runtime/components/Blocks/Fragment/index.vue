<template>
  <component :is="component" v-if="component" />
</template>

<script lang="ts" setup>
import { getBlokkliFragmentComponent } from '#blokkli/imports'
import { provide, defineBlokkli } from '#imports'
import { INJECT_FRAGMENT_CONTEXT } from '#blokkli/helpers/symbols'

const componentProps = defineProps<{
  name: string
}>()

const ctx = defineBlokkli({
  bundle: 'fragment',
  editor: {
    disableEdit: true,
  },
})

const component = getBlokkliFragmentComponent(componentProps.name)

provide(INJECT_FRAGMENT_CONTEXT, ctx)
</script>
