<template>
  <PluginSidebar
    id="structure"
    :title="$t('structureToolbarLabel', 'Structure')"
    :tour-text="
      $t(
        'structureTourText',
        'Shows a structured list of all blocks on the current page. Click on any block to quickly jump to it.',
      )
    "
    icon="bk_mdi_account_tree"
    weight="-90"
  >
    <ScrollBoundary
      v-if="isLoaded"
      id="bk-structure"
      class="bk bk-structure bk-control"
      dragging
    >
      <List
        :entity-bundle="context.entityBundle"
        :entity-type="context.entityType"
        :entity-uuid="context.entityUuid"
        :visible-field-keys="visibleFieldKeys"
      />
    </ScrollBoundary>
  </PluginSidebar>
</template>

<script lang="ts" setup>
import {
  ref,
  useBlokkli,
  defineBlokkliFeature,
  provide,
  onBeforeUnmount,
  onMounted,
  reactive,
} from '#imports'
import { PluginSidebar } from '#blokkli/editor/plugins'
import { ScrollBoundary } from '#blokkli/editor/components'
import List from './List/index.vue'
import { defineDropHandler } from '#blokkli/editor/composables'

defineBlokkliFeature({
  id: 'structure',
  icon: 'bk_mdi_account_tree',
  label: 'Structure',
  description:
    'Provides a sidebar button to render a structured list of all blocks on the current page.',
})

const { $t, context, adapter, state, dom, ui, eventBus } = useBlokkli()

// existing_structure: move structure blocks.
defineDropHandler('existing_structure', {
  async execute({ items, host, afterUuid }) {
    const uuids = items.map((v) => v.block.uuid)

    await state.mutateWithLoadingState(() =>
      adapter.moveMultipleBlocks({
        uuids,
        afterUuid,
        host,
      }),
    )

    if (uuids.length >= 1 && uuids.length <= 10) {
      for (let i = 0; i < uuids.length; i++) {
        dom.refreshBlockRect(uuids[i]!)
      }
    }

    if (ui.isMobile.value && uuids.length) {
      eventBus.emit('scrollIntoView', {
        uuid: uuids[0]!,
        center: true,
      })
    }
  },
})

const isLoaded = ref(false)

const visibleFieldKeys = reactive<Record<string, boolean>>({})

const observer = new IntersectionObserver(function (entries) {
  for (const entry of entries) {
    if (entry.target instanceof HTMLElement) {
      const key = entry.target.dataset.structureFieldKey
      if (key) {
        visibleFieldKeys[key] = entry.isIntersecting
      }
    }
  }
})

provide('bk_structure_observer', observer)

onMounted(() => {
  isLoaded.value = true
})

onBeforeUnmount(() => {
  observer.disconnect()
})
</script>

<script lang="ts">
export default {
  name: 'Structure',
}
</script>
