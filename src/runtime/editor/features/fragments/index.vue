<template>
  <Teleport :to="ui.mainLayoutElement.value">
    <BlokkliTransition name="slide-in">
      <FragmentsDialog
        v-if="placedAction"
        :field="placedAction.field"
        @close="placedAction = null"
        @submit="onAddFragment"
      />
    </BlokkliTransition>
  </Teleport>
</template>

<script lang="ts" setup>
import { ref, useBlokkli, defineBlokkliFeature, computed } from '#imports'
import FragmentsDialog from './Dialog/index.vue'
import { BlokkliTransition } from '#blokkli/editor/components'
import { defineAddAction } from '#blokkli/editor/composables'
import type { ActionPlacedData } from '#blokkli/editor/types/actions';
import { fragmentBlockBundle } from '#blokkli-build/config';

const { adapter } = defineBlokkliFeature({
  id: 'fragments',
  icon: 'bk_mdi_newspaper',
  label: 'Fragments',
  description: 'Provides way to add content fragments defined by the frontend.',
  requiredAdapterMethods: ['fragmentsAddBlock'],
  dependencies: ['add-list'],
})

const { state, $t, types, dom, ui } = useBlokkli()

const placedAction = ref<ActionPlacedData | null>(null)

const onAddFragment = async (name: string) => {
  if (!placedAction.value || !adapter.fragmentsAddBlock) {
    return
  }

  await state.mutateWithLoadingState(() =>
    adapter.fragmentsAddBlock({
      name,
      host: placedAction.value!.host,
      preceedingUuid: placedAction.value!.preceedingUuid,
    }),
  )

  placedAction.value = null
}

const isSupportedOnEntity = computed(() =>
  types.generallyAvailableBundles.find((v) => v.id === fragmentBlockBundle),
)

defineAddAction(() => {
  if (!isSupportedOnEntity.value) {
    return
  }

  return {
    id: 'fragment',
    icon: 'bk_mdi_newspaper',
    color: 'accent',
    itemBundle: fragmentBlockBundle,
    title: $t('fragmentsAddFragmentAction', 'Add fragment'),
    description: $t(
      'fragmentsAddFragmentDescription',
      '<p>Drag the icon into the page to add a fragment block.</p><p>Fragments are reusable blocks that always render the same content.</p>',
    ),
    callback: (action: ActionPlacedData) => {
      placedAction.value = action
    },
    enabled: (item) => {
      const field = dom.getRegisteredField(item.host.uuid, item.host.fieldName)
      return !!field?.allowedFragments.length
    },
  }
})
</script>

<script lang="ts">
export default {
  name: 'Fragments',
}
</script>
