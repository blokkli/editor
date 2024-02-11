<template>
  <Teleport to="#bk-blokkli-item-actions-controls">
    <OptionsForm
      v-if="definition && !selection.isDragging.value && !ui.isAnimating.value"
      :key="uuids.join('-') + state.refreshKey.value + ui.isAnimating.value"
      :uuids="uuids"
      :definition="definition"
    />
  </Teleport>
</template>

<script lang="ts" setup>
import { computed, useBlokkli, defineBlokkliFeature } from '#imports'
import { falsy, onlyUnique } from '#blokkli/helpers'
import { getDefinition, getFragmentDefinition } from '#blokkli/definitions'
import OptionsForm from './Form/index.vue'
import type {
  BlockDefinitionInput,
  FragmentDefinitionInput,
} from '~/src/runtime/types'

defineBlokkliFeature({
  id: 'options',
  label: 'Options',
  icon: 'palette',
  description: 'Renders the options form for one or more blocks.',
  requiredAdapterMethods: ['updateOptions'],
})

const { selection, state, ui } = useBlokkli()

const uuids = computed(() => selection.blocks.value.map((v) => v.uuid))

const definition = computed<
  BlockDefinitionInput<any, any> | FragmentDefinitionInput<any, any> | undefined
>(() => {
  const bundles = selection.blocks.value
    .map((v) => v.reusableBundle || v.itemBundle)
    .filter(onlyUnique)

  if (bundles.length !== 1) {
    return
  }

  const bundle = bundles[0]

  if (bundle === 'fragment') {
    const fragments = selection.blocks.value.filter(
      (v) => v.itemBundle === 'fragment',
    )

    const fragmentNames = fragments
      .map((v) => {
        const props: any = state.getRenderedBlock(v.uuid)?.item?.props
        if (props && props.name) {
          return props.name
        }
      })
      .filter(falsy)
      .filter(onlyUnique)

    if (fragmentNames.length !== 1) {
      return
    }

    return getFragmentDefinition(fragmentNames[0])
  }

  return getDefinition(bundles[0])
})
</script>

<script lang="ts">
export default {
  name: 'Options',
}
</script>
