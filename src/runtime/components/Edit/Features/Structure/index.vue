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
    edit-only
    icon="tree"
    weight="-90"
  >
    <div v-if="isLoaded" class="bk bk-structure bk-control" @wheel.stop>
      <List
        :entity-bundle="context.entityBundle"
        :entity-type="context.entityType"
        :entity-uuid="context.entityUuid"
        :visible-field-keys="visibleFieldKeys"
      />
    </div>
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
import { PluginSidebar } from '#blokkli/plugins'
import List from './List/index.vue'

defineBlokkliFeature({
  id: 'structure',
  icon: 'tree',
  label: 'Structure',
  description:
    'Provides a sidebar button to render a structured list of all blocks on the current page.',
})

const { $t, context } = useBlokkli()

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
