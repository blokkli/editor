<template>
  <div
    id="bk-toolbar-view-options"
    class="relative group border-l border-l-mono-600"
  >
    <button
      ref="toggleElement"
      class="bk-toolbar-button bk-has-dropdown group/tooltip"
      :class="{
        'bk-is-active': isVisible,
      }"
      @click.prevent="isVisible = !isVisible"
    >
      <Icon name="bk_mdi_visibility" />
      <Tooltip
        :label="$t('viewOptions', 'View options')"
        placement="below-right"
      />
    </button>
    <BlokkliTransition name="context-menu">
      <ToolbarDropdown
        v-if="isVisible"
        :toggle-element
        :title="$t('viewOptions', 'View options')"
        class="origin-top-right"
        @close="isVisible = false"
      >
        <ViewOptionsList :options />
      </ToolbarDropdown>
    </BlokkliTransition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useBlokkli, useTemplateRef } from '#imports'
import ViewOptionsList from './List/index.vue'
import {
  Icon,
  ToolbarDropdown,
  Tooltip,
  BlokkliTransition,
} from '#blokkli/editor/components'

const { plugins, $t } = useBlokkli()

const isVisible = ref(false)

const toggleElement = useTemplateRef('toggleElement')

const options = computed(() =>
  [...plugins.get('viewOption')].sort(
    (a, b) => (a.weight ?? 0) - (b.weight ?? 0),
  ),
)
</script>

<script lang="ts">
export default {
  name: 'ToolbarViewOptions',
}
</script>
