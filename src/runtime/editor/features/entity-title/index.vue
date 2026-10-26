<template>
  <Teleport to="#bk-toolbar-title">
    <button
      v-if="scheduledDate"
      class="bk-toolbar-title-scheduled group/tooltip"
      data-test="toolbar-scheduled-date"
      :data-test-scheduled-date="scheduledDate"
      @click.prevent="onShowPublishDialog"
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
      class="bk-toolbar-button group/tooltip w-full justify-start relative"
      data-test="entity-title"
      :data-test-entity-status="statusIndicatorStatus"
      :data-test-entity-status-scope="
        languageName ? 'language' : isStatusShared ? 'all-languages' : 'page'
      "
      :disabled="!state.canEdit.value"
      @click="onEditEntity"
    >
      <div class="flex items-center relative size-full">
        <div class="flex items-center">
          <StatusIndicator :status="statusIndicatorStatus" class="mr-10" />
          <strong class="text-mono-100">{{ entity.label }}</strong>
          <span>&nbsp;{{ entity.bundleLabel }}</span>
        </div>
        <div
          v-if="lastChanged"
          class="text-[11px] text-mono-300 border border-mono-500 px-5 py-1 rounded-full ml-10 font-medium"
        >
          {{ $t('entityTitleLastChanged', 'Last changed') }}
          <RelativeTime :timestamp="lastChanged" />
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
import {
  Icon,
  RelativeTime,
  StatusIndicator,
  Tooltip,
} from '#blokkli/editor/components'
import { defineCommands, defineTourItem } from '#blokkli/editor/composables'
import type { UiStatus } from '#blokkli/editor/types/ui'

defineBlokkliFeature({
  id: 'entity-title',
  icon: 'bk_mdi_title',
  label: 'Entity Title',
  description: 'Renders the title and status of the page entity.',
})

const { state, eventBus, $t, ui, context } = useBlokkli()
const { entity, mutations, lastChanged, translation } = state
const buttonEl = useTemplateRef('buttonEl')

// Persist any pending option changes before opening the entity edit form
// (built from server state) or the publish dialog.
async function onEditEntity() {
  await ui.flushPendingChanges()
  eventBus.emit('editEntity')
}

async function onShowPublishDialog() {
  await ui.flushPendingChanges()
  eventBus.emit('publish:show-dialog')
}

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

/**
 * The name of the language being edited, when the page has several and each
 * of them has a status of its own.
 */
const languageName = computed<string | null>(() => {
  if (
    !translation.value.isTranslatable ||
    translation.value.isStatusTranslatable !== true ||
    (translation.value.availableLanguages?.length ?? 0) < 2
  ) {
    return null
  }
  const language = translation.value.availableLanguages?.find(
    (v) => v.id === context.value.language,
  )
  return language?.name ?? context.value.language
})

/**
 * Whether every language of the page shares one status.
 */
const isStatusShared = computed(
  () =>
    !!translation.value.isTranslatable &&
    translation.value.isStatusTranslatable === false &&
    (translation.value.availableLanguages?.length ?? 0) > 1,
)

const tooltipLabel = computed(() => {
  if (languageName.value) {
    let label = $t(
      'entityTitleLanguageNotPublished',
      '@language: not published',
    )
    if (entity.value.status && mutations.value.length) {
      label = $t(
        'entityTitleLanguagePublishedWithPendingChanges',
        '@language: published (changes pending)',
      )
    } else if (entity.value.status) {
      label = $t('entityTitleLanguagePublished', '@language: published')
    }
    return label.replace('@language', languageName.value)
  }

  if (isStatusShared.value) {
    if (!entity.value.status) {
      return $t(
        'entityTitleNotPublishedInAnyLanguage',
        'Page is not published in any language',
      )
    }
    return mutations.value.length
      ? $t(
          'entityTitlePublishedInAllLanguagesWithPendingChanges',
          'Page is published in all languages (changes pending)',
        )
      : $t(
          'entityTitlePublishedInAllLanguages',
          'Page is published in all languages',
        )
  }

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
    callback: onEditEntity,
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
