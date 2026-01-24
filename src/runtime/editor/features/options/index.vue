<template>
  <Teleport to="#bk-blokkli-item-actions-controls">
    <OptionsForm
      v-if="
        definition &&
        !selection.isDragging.value &&
        !ui.isAnimating.value &&
        uuids
      "
      :key="key + state.refreshKey.value + ui.isAnimating.value"
      :uuids
      :definition
    />
  </Teleport>
</template>

<script lang="ts" setup>
import { computed, useBlokkli, defineBlokkliFeature } from '#imports'
import { falsy, onlyUnique } from '#blokkli/helpers'
import OptionsForm from './Form/index.vue'
import type {
  BlockDefinitionInput,
  FragmentDefinitionInput,
  ProviderDefinitionInput,
} from '#blokkli/types/definitions'
import { fragmentBlockBundle } from '#blokkli-build/config'

defineBlokkliFeature({
  id: 'options',
  label: 'Options',
  icon: 'bk_mdi_palette',
  description: 'Renders the options form for one or more blocks.',
  requiredAdapterMethods: ['updateOptions'],
})

const { selection, state, ui, definitions, context } = useBlokkli()

const uuids = computed(() => {
  const uuids = selection.items.value.map((v) => v.uuid)
  if (uuids.length) {
    return uuids
  } else if (selection.hasHostSelected.value) {
    return 'provider'
  }

  return null
})

const key = computed(() => {
  if (typeof uuids.value === 'string') {
    return uuids.value
  } else if (uuids.value && typeof uuids.value === 'object') {
    return uuids.value.join('-')
  }

  return 'none'
})

const definition = computed<
  | BlockDefinitionInput<any, any>
  | FragmentDefinitionInput<any, any>
  | ProviderDefinitionInput<any, any>
  | undefined
>(() => {
  if (uuids.value === 'provider') {
    return definitions.getProviderDefinition(
      context.value.entityType,
      context.value.entityBundle,
    )
  }

  const bundles = selection.items.value
    .map((v) => v.library?.reusableBundle || v.bundle)
    .filter(onlyUnique)

  // @TODO: Support shared global options.
  if (bundles.length !== 1) {
    return
  }

  const bundle = bundles[0]!

  if (bundle === fragmentBlockBundle) {
    const fragments = selection.items.value.filter(
      (v) => v.bundle === fragmentBlockBundle,
    )

    const fragmentNames = fragments
      .map((v) => {
        const props: any = state.getFieldListItem(v.uuid)?.props
        if (props && props.name) {
          return props.name
        }
      })
      .filter(falsy)
      .filter(onlyUnique)

    if (fragmentNames.length !== 1) {
      return
    }

    return definitions.getFragmentDefinition(fragmentNames[0])
  }

  return selection.items.value
    .map((block) => {
      return definitions.getBlockDefinition(
        bundle,
        block.fieldListType,
        block.parentBlockBundle,
      )
    })
    .filter(falsy)
    .at(0)
})
</script>

<script lang="ts">
export default {
  name: 'Options',
}
</script>
