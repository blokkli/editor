<template>
  <Teleport to="#bk-blokkli-item-actions-dropdown" defer>
    <List
      v-if="uuids.length && uuids.length <= 5 && ui.itemActionsOpen.value"
      :uuids
      :get-cache
    />
  </Teleport>
</template>

<script lang="ts" setup>
import {
  useBlokkli,
  defineBlokkliFeature,
  computed,
  defineAsyncComponent,
} from '#imports'
import { useStateBasedCache } from '#blokkli/editor/composables'
import type { ReferencedEntity } from './types'

const List = defineAsyncComponent(() => import('./List/index.vue'))

defineBlokkliFeature({
  id: 'referenced-entities',
  label: 'Referenced Entities',
  icon: 'bk_mdi_join',
  description: 'Renders referenced entities of blocks.',
  requiredAdapterMethods: ['getReferencedEntities'],
})

const { selection, ui } = useBlokkli()

const uuids = computed<string[]>(() => {
  return selection.uuids.value
})

type Cache = {
  loadedUuids: Set<string>
  entities: Map<string, ReferencedEntity>
}

const getCache = useStateBasedCache<Cache>(() => ({
  loadedUuids: new Set(),
  entities: new Map(),
}))
</script>

<script lang="ts">
export default {
  name: 'ReferencedEntities',
}
</script>
