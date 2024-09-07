<template>
  <PluginAddAction
    v-if="
      adapter.addLibraryItem && adapter.getLibraryItems && isSupportedOnEntity
    "
    type="fragment"
    :title="$t('fragmentsAddFragmentAction', 'Add fragment')"
    :description="
      $t(
        'fragmentsAddFragmentDescription',
        '<p>Drag the icon into the page to add a fragment block.</p><p>Fragments are reusable blocks that always render the same content.</p>',
      )
    "
    :disabled="!isEnabled"
    item-bundle="blokkli_fragment"
    icon="fragment"
    color="accent"
    @placed="placedAction = $event"
  />

  <Teleport to="body">
    <transition name="bk-slide-in" :duration="200">
      <FragmentsDialog
        v-if="placedAction && adapter.getLibraryItems"
        :field="placedAction.field"
        @close="placedAction = null"
        @submit="onAddFragment"
      />
    </transition>
  </Teleport>
</template>

<script lang="ts" setup>
import { ref, useBlokkli, defineBlokkliFeature, computed } from '#imports'
import { PluginAddAction } from '#blokkli/plugins'
import FragmentsDialog from './Dialog/index.vue'
import type { ActionPlacedEvent } from '#blokkli/types'

const { adapter } = defineBlokkliFeature({
  id: 'fragments',
  icon: 'fragment',
  label: 'Fragments',
  description: 'Provides way to add content fragments defined by the frontend.',
  requiredAdapterMethods: ['fragmentsAddBlock'],
})

const { state, $t, types, selection, dom } = useBlokkli()

const isEnabled = computed<boolean>(() => {
  if (selection.blocks.value.length === 1) {
    const block = selection.blocks.value[0]
    const field = dom.findField(block.hostUuid, block.hostFieldName)
    return !!field?.allowedFragments.length
  }

  return true
})

const placedAction = ref<ActionPlacedEvent | null>(null)

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
  types.generallyAvailableBundles.find((v) => v.id === 'blokkli_fragment'),
)
</script>

<script lang="ts">
export default {
  name: 'Fragments',
}
</script>
