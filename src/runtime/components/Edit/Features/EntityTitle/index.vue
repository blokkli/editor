<template>
  <Teleport to="#bk-toolbar-title">
    <button
      ref="buttonEl"
      class="bk-toolbar-button"
      :disabled="!state.canEdit.value"
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
          statusPublished
        }}</span>
        <span v-else-if="entity.status && mutations.length">{{
          statusPending
        }}</span>
        <span v-else>{{ statusUnpublished }}</span>
      </div>
    </button>
  </Teleport>
</template>

<script lang="ts" setup>
import defineCommands from '#blokkli/helpers/composables/defineCommands'
import { useBlokkli, defineBlokkliFeature, ref, computed } from '#imports'
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

const statusPublished = computed(() =>
  $t('pageIsPublished', 'Page is published'),
)

const statusPending = computed(() =>
  $t(
    'pageIsPublishedWithPendingChanges',
    'Page is published (changes pending)',
  ),
)

const statusUnpublished = computed(() =>
  $t('pageIsNotPublished', 'Page is not published'),
)

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

const tourText = computed(() => {
  const intro = $t(
    'entityTitleTourText',
    '<p>Shows the title and status of the current page.</p><p>Click on the title to open the page edit form.</p>',
  )

  return `
${intro}
<ul>
<li><div class="bk-status-indicator"></div>${statusUnpublished.value}</li>
<li><div class="bk-status-indicator bk-is-warning"></div>${statusPending.value}</li>
<li><div class="bk-status-indicator bk-is-success"></div>${statusPublished.value}</li>
</ul>
`
})

defineTourItem(() => {
  return {
    id: 'entity-title',
    title: $t('entityTitleTourTitle', 'Page'),
    text: tourText.value,
    element: buttonEl.value,
  }
})
</script>

<script lang="ts">
export default {
  name: 'EntityTitle',
}
</script>
