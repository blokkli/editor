<template>
  <Teleport to="#bk-toolbar-title">
    <button
      v-if="scheduledDate"
      class="bk-toolbar-title-scheduled group/tooltip"
      @click.prevent="eventBus.emit('publish:show-dialog')"
    >
      <Icon name="bk_mdi_calendar_clock" />
      <div class="bk-toolbar-title-scheduled-text">
        <div>{{ formattedScheduledDate }}</div>
      </div>
      <Tooltip
        :label="
          $t('scheduledFor', 'The changes will be published on this date.')
        "
      />
    </button>
    <button
      ref="buttonEl"
      class="bk-toolbar-button group/tooltip"
      :disabled="!state.canEdit.value"
      @click="eventBus.emit('editEntity')"
    >
      <div class="bk-toolbar-title">
        <div>
          <StatusIndicator :status="statusIndicatorStatus" />
          <strong>{{ entity.label }}</strong>
          <span>&nbsp;{{ entity.bundleLabel }}</span>
        </div>
      </div>
      <Tooltip :label="tooltipLabel" />
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
import { Icon, StatusIndicator, Tooltip } from '#blokkli/editor/components'
import { defineCommands, defineTourItem } from '#blokkli/editor/composables'
import type { UiStatus } from '#blokkli/editor/types/ui'

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

const tooltipLabel = computed(() => {
  if (entity.value.status && !mutations.value.length) {
    return $t('pageIsPublished', 'Page is published')
  } else if (entity.value.status && mutations.value.length) {
    return $t(
      'pageIsPublishedWithPendingChanges',
      'Page is published (changes pending)',
    )
  }

  return $t('pageIsNotPublished', 'Page is not published')
})

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

defineTourItem(() => {
  return {
    id: 'entity-title',
    title: $t('entityTitleTourTitle', 'Page'),
    text: $t(
      'entityTitleTourText',
      '<p>Shows the title and status of the current page.</p><p>Click on the title to open the page edit form.</p>',
    ),
    element: buttonEl.value,
  }
})

const statusIndicatorStatus = computed<UiStatus>(() => {
  if (entity.value.status) {
    if (mutations.value.length) {
      return 'warning'
    } else {
      return 'success'
    }
  }

  return 'error'
})
</script>

<script lang="ts">
export default {
  name: 'EntityTitle',
}
</script>
