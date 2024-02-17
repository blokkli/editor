<template>
  <Teleport to="#bk-toolbar-title">
    <button
      ref="buttonEl"
      class="bk-toolbar-button"
      @click="eventBus.emit('editEntity')"
    >
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
import defineCommands from '#blokkli/helpers/composables/defineCommands'
import { useBlokkli, defineBlokkliFeature, ref } from '#imports'
import defineTourItem from '#blokkli/helpers/composables/defineTourItem'

defineBlokkliFeature({
  id: 'entity-title',
  icon: 'title',
  label: 'Entity Title',
  description: 'Renders the title and status of the page entity.',
})

const { state, eventBus, $t } = useBlokkli()
const { entity, mutations } = state
const buttonEl = ref<HTMLButtonElement | null>(null)

defineCommands(() => {
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
})

defineTourItem(() => {
  return {
    id: 'entity-title',
    title: $t('entityTitleTourTitle', 'Page'),
    text: $t('entityTitleTourText', 'Shows the title of the current page.'),
    element: buttonEl.value,
  }
})
</script>

<script lang="ts">
export default {
  name: 'EntityTitle',
}
</script>
