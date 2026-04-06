<template>
  <div class="order-last bg-mono-700">
    <div class="px-10 py-5 group/tooltip relative">
      <span
        class="uppercase font-semibold tracking-wide text-mono-300 text-xs"
        >{{ $t('relatedContent', 'Related Content') }}</span
      >
      <Tooltip
        :label="
          $t(
            'relatedContentTooltip',
            'Content like pages or images referenced or linked by this block.',
          )
        "
        placement="center-after"
      />
    </div>
    <div
      v-if="isLoading || !entities.length"
      class="flex gap-10 px-10 pt-5 pb-10 items-center text-sm"
    >
      <Icon v-if="isLoading" name="spinner" class="animate-spin size-15" />
      <span v-if="isLoading" class="font-semibold">{{
        $t('loading', 'Loading...')
      }}</span>
      <span v-else>{{
        $t('relatedContentNoEntitiesFound', 'No related content found')
      }}</span>
    </div>
    <ol v-else-if="entities.length">
      <li v-for="entity in entities" :key="entity.entityUuid">
        <Item v-bind="entity" />
      </li>
    </ol>
  </div>
</template>

<script setup lang="ts">
import { useBlokkli, ref, onMounted } from '#imports'
import type { ReferencedEntity } from '../types'
import { Tooltip, Icon } from '#blokkli/editor/components'
import Item from './Item/index.vue'

const props = defineProps<{
  uuids: string[]
  getCache: () => {
    loadedUuids: Set<string>
    entities: Map<string, ReferencedEntity>
  }
}>()

const { $t, adapter } = useBlokkli()

const isLoading = ref(false)
const entities = ref<ReferencedEntity[]>([])

onMounted(async () => {
  const cache = props.getCache()
  const uncachedUuids = props.uuids.filter(
    (uuid) => !cache.loadedUuids.has(uuid),
  )

  if (uncachedUuids.length && adapter.getReferencedEntities) {
    isLoading.value = true
    const results = await adapter.getReferencedEntities(uncachedUuids)
    for (const entity of results) {
      const existing = cache.entities.get(entity.entityUuid)
      if (existing) {
        // Merge paragraph UUIDs from the new result.
        for (const uuid of entity.uuids) {
          if (!existing.uuids.includes(uuid)) {
            existing.uuids.push(uuid)
          }
        }
      } else {
        cache.entities.set(entity.entityUuid, entity)
      }
    }
    for (const uuid of uncachedUuids) {
      cache.loadedUuids.add(uuid)
    }
  }

  isLoading.value = false

  // Filter cached entities to those referenced by the current selection.
  entities.value = [...cache.entities.values()].filter((entity) =>
    entity.uuids.some((uuid) => props.uuids.includes(uuid)),
  )
})
</script>
