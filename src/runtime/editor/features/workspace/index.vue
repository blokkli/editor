<template>
  <Teleport to="#bk-toolbar-title">
    <div class="relative order-last">
      <button
        type="button"
        class="bk-toolbar-button group/tooltip"
        :class="{
          'bk-is-active': isOpen,
        }"
        @click.prevent="isOpen = !isOpen"
      >
        <Icon name="bk_mdi_more_horiz" />
      </button>

      <Dropdown v-if="isOpen" />
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { useBlokkli, defineBlokkliFeature, ref } from '#imports'
import { Icon } from '#blokkli/editor/components'
import Dropdown from './Dropdown/index.vue'

defineBlokkliFeature({
  id: 'workspace',
  icon: 'bk_mdi_workspaces',
  label: 'Workspace',
  description: 'Allows users to switch between edit states.',
})

const { $t } = useBlokkli()

const isOpen = ref(true)
</script>

<script lang="ts">
export default {
  name: 'Workspace',
}
</script>
