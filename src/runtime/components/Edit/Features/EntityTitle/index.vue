<template>
  <Teleport to="#bk-toolbar-title">
    <button class="bk-toolbar-button" @click="eventBus.emit('editEntity')">
      <div class="bk-toolbar-title">
        <div>
          <span
            class="bk-status-indicator"
            :class="{
              'bk-is-success': entity.status && !mutations.length,
              'bk-is-warning': entity.status && mutations.length,
            }"
          />
          <strong>{{ entity.label }}</strong>
          <span>&nbsp;{{ entity.bundleLabel }}</span>
        </div>
      </div>
      <div class="bk-tooltip">
        <span v-if="entity.status && !mutations.length">{{
          $t('pageIsPublished', 'Page is published')
        }}</span>
        <span v-else-if="entity.status && mutations.length">{{
          $t(
            'pageIsPublishedWithPendingChanges',
            'Page is published (changes pending)',
          )
        }}</span>
        <span v-else>{{
          $t('pageIsNotPublished', 'Page is not published')
        }}</span>
      </div>
    </button>
  </Teleport>
</template>

<script lang="ts" setup>
import type { Command } from '#blokkli/types'
import {
  useBlokkli,
  defineBlokkliFeature,
  onMounted,
  onBeforeUnmount,
} from '#imports'

defineBlokkliFeature({
  id: 'entity-title',
  icon: 'title',
  label: 'Entity Title',
  description: 'Renders the title and status of the page entity.',
})

const { state, eventBus, $t, commands } = useBlokkli()
const { entity, mutations } = state

const commandProvider = (): Command => {
  return {
    id: 'feature:entity-title:edit-entity',
    group: 'misc',
    label: $t('editFormEntityEdit', 'Edit @label').replace(
      '@label',
      entity.value.label || 'Page',
    ),
    callback: () => eventBus.emit('editEntity'),
    icon: 'edit',
  }
}

onMounted(() => {
  commands.add(commandProvider)
})

onBeforeUnmount(() => {
  commands.remove(commandProvider)
})
</script>

<script lang="ts">
export default {
  name: 'EntityTitle',
}
</script>
