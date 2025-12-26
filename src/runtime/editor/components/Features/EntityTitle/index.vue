<template>
  <Teleport to="#bk-toolbar-title">
    <button
      v-if="scheduledDate"
      class="bk-toolbar-title-scheduled"
      @click.prevent="eventBus.emit('publish:show-dialog')"
    >
      <Icon name="bk_mdi_calendar_clock" />
      <div class="bk-toolbar-title-scheduled-text">
        <div>{{ formattedScheduledDate }}</div>
      </div>
      <div class="bk-tooltip">
        <div>
          {{
            $t('scheduledFor', 'The changes will be published on this date.')
          }}
        </div>
      </div>
    </button>
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
import {
  useBlokkli,
  defineBlokkliFeature,
  computed,
  useTemplateRef,
} from '#imports'
import { Icon } from '#blokkli/editor/components'
import { defineCommands, defineTourItem } from '#blokkli/editor/composables'

defineBlokkliFeature({
  id: 'entity-title',
  icon: 'bk_mdi_title',
  label: 'Entity Title',
  description: 'Renders the title and status of the page entity.',
})

const { state, eventBus, $t, ui } = useBlokkli()
const { entity, mutations } = state
const buttonEl = useTemplateRef('buttonEl')

const scheduledDate = computed(() => state.publishOptions.value?.publishOn)

const formattedScheduledDate = computed(() => {
  if (!scheduledDate.value) {
    return ''
  }
  return ui.formatDate(scheduledDate.value, {
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
})

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
    icon: 'bk_mdi_edit',
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
