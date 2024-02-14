<template>
  <PluginAddAction
    v-if="adapter.addLibraryItem && adapter.getLibraryItems"
    type="fragment"
    :title="$t('fragmentsAddFragmentAction', 'Add fragment')"
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
import { ref, computed, useBlokkli, defineBlokkliFeature } from '#imports'
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

const { state, types, $t } = useBlokkli()

const placedAction = ref<ActionPlacedEvent | null>(null)

const onAddFragment = async (name: string) => {
  if (!placedAction.value || !adapter.fragmentsAddBlock) {
    return
  }

  await state.mutateWithLoadingState(
    adapter.fragmentsAddBlock({
      name,
      host: placedAction.value.host,
      preceedingUuid: placedAction.value.preceedingUuid,
    }),
  )

  placedAction.value = null
}

const allowedInList = computed(() =>
  types.allowedTypesInList.value.includes('blokkli_fragment'),
)
</script>

<script lang="ts">
export default {
  name: 'Fragments',
}
</script>
