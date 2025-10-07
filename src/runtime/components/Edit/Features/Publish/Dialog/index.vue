<template>
  <DialogModal
    :title="$t('publishDialogTitle', 'Publish changes')"
    :width="900"
    :submit-label
    :is-loading="isLoading"
    :can-submit="canSubmit"
    class="bk-is-publish-dialog"
    @submit="onSubmit"
    @cancel="$emit('close')"
  >
    <div class="bk bk-form bk-dialog-publish-form">
      <FormItem>
        <div class="bk-form-label">
          {{ $t('publishMode', 'Publish mode')
          }}<span class="bk-required-indicator">*</span>
        </div>
        <div class="bk-publish-options">
          <PublishOption
            id="save"
            v-model="publishMode"
            icon="save"
            color="red"
            :label="$t('publishModeSaveTitle', 'Save')"
            :description="
              $t(
                'publishModeSaveDescription',
                'Save changes without publishing',
              )
            "
            :disabled="isCurrentlyPublished || isAlreadyScheduled"
          />
          <PublishOption
            id="immediate"
            v-model="publishMode"
            icon="publish"
            color="lime"
            :label="$t('publishModeImmediateTitle', 'Publish')"
            :description="
              $t(
                'publishModeImmediateDescription',
                'Publish changes immediately',
              )
            "
            :disabled="isAlreadyScheduled"
          />
          <PublishOption
            v-if="canSchedule"
            id="scheduled"
            v-model="publishMode"
            icon="calendar-clock"
            color="yellow"
            :label="$t('publishModeScheduledTitle', 'Schedule')"
            :description="
              $t(
                'publishModeScheduledDescription',
                'Schedule changes for publishing',
              )
            "
          />
        </div>
      </FormItem>
      <FormItem v-if="publishOptions?.hasRevisionLogMessage">
        <FormTextarea
          id="revision-message"
          v-model="revisionMessage"
          :label="$t('publishRevisionLogMessage', 'Revision log message')"
          :description="
            $t(
              'publishRevisionLogMessageDescription',
              'Briefly describe the changes made',
            )
          "
          :disabled="isLoading || isAlreadyScheduled"
          rows="2"
        />
      </FormItem>
      <FormItem v-if="publishMode === 'scheduled'">
        <div>
          <label class="bk-form-label">
            {{ $t('publishScheduleDate', 'Publication date') }}
          </label>
          <div class="bk-publish-schedule-date-wrapper">
            <div v-if="isAlreadyScheduled" class="bk-publish-scheduled-display">
              {{
                ui.formatDate(scheduleDate, {
                  weekday: 'long',
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              }}
            </div>
            <ScheduleDate v-else v-model="scheduleDate" :disabled="isLoading" />
            <button
              v-if="isAlreadyScheduled"
              type="button"
              class="bk-button bk-is-danger"
              @click="removeScheduledDate"
            >
              {{ $t('publishRemoveSchedule', 'Remove schedule') }}
            </button>
          </div>
          <div class="bk-form-description">
            <template v-if="isAlreadyScheduled">
              {{
                $t(
                  'publishAlreadyScheduledDescription',
                  'This page is already scheduled for publishing',
                )
              }}
            </template>
            <template v-else>
              {{
                $t(
                  'publishScheduleDateDescription',
                  'Select date and time for scheduled publication',
                )
              }}
            </template>
          </div>
        </div>
      </FormItem>

      <FormItem v-if="successItems.length && showTable">
        <h2 class="bk-heading-2">
          {{ $t('publishSuccessfullyPublished', 'Successfully published') }}
        </h2>

        <table class="bk-table bk-publish-dialog-table">
          <thead>
            <tr>
              <th>{{ $t('publishName', 'Name') }}</th>
              <th colspan="2">{{ $t('publishStatus', 'Status') }}</th>
            </tr>
          </thead>

          <tbody>
            <Item
              v-for="item in successItems"
              :key="'success' + item.id"
              v-bind="item"
              v-model="states"
              :is-current="item.id === currentId"
              :should-publish
              :is-mutating
              :mutation-status="mutationStatusItems[item.id]"
              :is-scheduled="enableScheduling"
              :schedule-date
            />
          </tbody>
        </table>

        <table class="bk-table bk-publish-dialog-table">
          <thead>
            <tr>
              <th>{{ $t('publishName', 'Name') }}</th>
              <th colspan="2">{{ $t('publishStatus', 'Status') }}</th>
            </tr>
          </thead>

          <tbody>
            <Item
              v-for="item in toPublishItems"
              :key="'to_publish_' + item.id"
              v-bind="item"
              v-model="states"
              :is-current="item.id === currentId"
              :should-publish
              :is-mutating
              :mutation-status="mutationStatusItems[item.id]"
              :is-scheduled="enableScheduling"
              :schedule-date
            />
          </tbody>
        </table>
      </FormItem>
      <Summary
        :is-published="isCurrentlyPublished"
        :mode="publishMode"
        :current-state-label="currentStateLabel"
        :action-label="actionLabel"
        :result-state-label="resultStateLabel"
      />
    </div>
  </DialogModal>
</template>

<script lang="ts" setup>
import { ref, computed, watch, useBlokkli, useAsyncData } from '#imports'
import { DialogModal, FormTextarea, FormItem } from '#blokkli/components'
import type { GetEditStatesItem, Validation } from '#blokkli/types'
import { emitMessage } from '#blokkli/helpers/eventBus'
import Item from './Item.vue'
import PublishOption from './PublishOption.vue'
import Summary from './Summary.vue'
import ScheduleDate from './ScheduleDate.vue'
import type { MutationStatus } from './types'

const showTable = false

const { adapter, $t, state, context, ui } = useBlokkli()

const isMutating = ref(false)

const mutationStatusItems = ref<Record<string, MutationStatus>>({})

const publishedIds = ref<string[]>([])

const states = defineModel<string[]>('states', {
  default: () => [],
})

const revisionMessage = defineModel<string>('revisionMessage', {
  default: () => false,
})

/**
 * The selected publish mode: 'immediate', 'scheduled', or 'save'.
 */
const publishMode = ref<'immediate' | 'scheduled' | 'save'>('immediate')

const emit = defineEmits<{
  (e: 'close' | 'submit'): void
}>()

const {
  data: publishOptions,
  status,
  refresh,
} = await useAsyncData(() => {
  return adapter.getPublishOptions!()
})

/**
 * Whether scheduling is possible.
 */
const canSchedule = computed<boolean>(() => !!publishOptions.value?.canSchedule)

/**
 * The current schedule date/time as an ISO string.
 */
const publishOn = computed<string | undefined>(
  () => publishOptions.value?.publishOn,
)

/**
 * Whether this entity is already scheduled for publishing.
 */
const isAlreadyScheduled = computed(() => !!publishOn.value)

/**
 * The selected schedule date/time.
 */
const scheduleDate = ref<string>(publishOn.value || '')

// Initialize publishMode and revisionMessage based on whether there's an existing schedule
if (publishOn.value) {
  publishMode.value = 'scheduled'
  if (publishOptions.value?.revisionLogMessage) {
    revisionMessage.value = publishOptions.value.revisionLogMessage
  }
}

// Watch for when user selects scheduled mode and set default date if needed
watch(publishMode, (newMode) => {
  if (newMode === 'scheduled' && !scheduleDate.value) {
    // Set to tomorrow at 12:00
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(12, 0, 0, 0)
    scheduleDate.value = tomorrow.toISOString()
  }
})

/**
 * Whether scheduling is enabled by the user.
 */
const enableScheduling = computed(() => publishMode.value === 'scheduled')

/**
 * Whether to publish when saving.
 */
const shouldPublish = computed(() => publishMode.value !== 'save')

const { data: editStates } = await useAsyncData(
  () => {
    if (adapter.getEditStates) {
      return adapter.getEditStates()
    }
    return Promise.resolve({
      items: [],
      perPage: 16,
      total: 0,
    })
  },
  {
    default: () => {
      return {
        items: [],
        perPage: 16,
        total: 0,
      }
    },
  },
)

const currentId = computed(
  () => `${context.value.entityType}:${context.value.entityUuid}`,
)

const isCurrentlyPublished = computed(() => !!state.entity.value?.status)

const stateItems = computed<Array<GetEditStatesItem & { id: string }>>(() => {
  const hostEntityType = context.value.entityType
  const hostEntityUuid = context.value.entityUuid

  return [
    {
      id: currentId.value,
      hostEntityType,
      hostEntityUuid,
      currentUserIsOwner: !!state.owner.value?.currentUserIsOwner,
      entity: state.entity.value,
    },
    ...editStates.value.items
      .map((v) => {
        return {
          ...v,
          id: `${v.hostEntityType}:${v.hostEntityUuid}`,
        }
      })
      .filter((v) => v.id !== currentId.value),
  ]
})

const successItems = computed(() =>
  stateItems.value.filter((v) => publishedIds.value.includes(v.id)),
)

const toPublishItems = computed(() =>
  stateItems.value.filter((v) => !publishedIds.value.includes(v.id)),
)

const selectedToPublishItems = computed(() =>
  toPublishItems.value.filter(
    (v) => currentId.value === v.id || states.value.includes(v.id),
  ),
)

const isLoading = computed(() => status.value === 'pending' || isMutating.value)

const canSubmit = computed(() => {
  if (!selectedToPublishItems.value.length) {
    return false
  }
  if (publishMode.value === 'scheduled' && !scheduleDate.value) {
    return false
  }
  if (publishMode.value === 'scheduled' && isAlreadyScheduled.value) {
    return false
  }
  return true
})

const submitLabel = computed(() => {
  const count = selectedToPublishItems.value.length

  if (publishMode.value === 'scheduled') {
    if (count === 0) {
      return $t('publishSchedulePublication', 'Schedule publication')
    }
    return count === 1
      ? $t('publishSchedulePublication', 'Schedule publication')
      : $t(
          'publishSchedulePublications',
          'Schedule @count publications',
        ).replace('@count', count.toString())
  }

  if (publishMode.value === 'save') {
    if (count === 0) {
      return $t('publishSaveContent', 'Save content')
    }
    return count === 1
      ? $t('publishSaveContent', 'Save content')
      : $t('publishSaveContents', 'Save @count contents').replace(
          '@count',
          count.toString(),
        )
  }

  // publishMode.value === 'immediate'
  if (count === 0) {
    return $t('publishPublishContent', 'Publish content')
  }
  return count === 1
    ? $t('publishPublishContent', 'Publish content')
    : $t('publishPublishContents', 'Publish @count contents').replace(
        '@count',
        count.toString(),
      )
})

const currentStateLabel = computed(() =>
  isCurrentlyPublished.value
    ? $t('publishCurrentlyPublished', 'Page is published')
    : $t('publishCurrentlyUnpublished', 'Page is unpublished'),
)

const actionLabel = computed(() => {
  if (publishMode.value === 'save') {
    return $t('publishModeSaveTitle', 'Save')
  }
  if (publishMode.value === 'scheduled') {
    return $t('publishModeScheduledTitle', 'Schedule')
  }
  return $t('publishModeImmediateTitle', 'Publish')
})

const resultStateLabel = computed(() => {
  if (publishMode.value === 'save') {
    return $t('publishResultUnpublished', 'Page is unpublished')
  }
  if (publishMode.value === 'scheduled' && scheduleDate.value) {
    const formattedDate = ui.formatDate(scheduleDate.value)
    return $t('publishResultScheduledOn', 'Page is published on @date').replace(
      '@date',
      formattedDate,
    )
  }
  return $t('publishResultPublished', 'Page is published')
})

async function removeScheduledDate() {
  if (!adapter.unscheduleEditState) {
    return
  }

  isMutating.value = true

  // Store the current schedule date to restore it after removal
  const previousScheduleDate = scheduleDate.value

  try {
    const result = await adapter.unscheduleEditState({
      hostEntityType: context.value.entityType,
      hostEntityUuid: context.value.entityUuid,
    })

    if (result.success) {
      await refresh()
      // Restore the previous schedule date so user can see/reuse it
      scheduleDate.value = previousScheduleDate
    }
  } catch (error) {
    console.error('Failed to unschedule:', error)
  } finally {
    isMutating.value = false
  }
}

async function onSubmit() {
  isMutating.value = true

  const items = stateItems.value

  let hasAnyError = false

  for (const item of items) {
    const isSelected =
      states.value.includes(item.id) ||
      (item.hostEntityType === context.value.entityType &&
        item.hostEntityUuid === context.value.entityUuid)

    if (!isSelected) {
      continue
    }

    // Skip items that have been successfully published.
    if (publishedIds.value.includes(item.id)) {
      continue
    }

    // Method exists because the feature is only loaded if the method exists.
    try {
      let result

      if (publishMode.value === 'scheduled') {
        // Schedule the edit state for later publishing
        if (!adapter.scheduleEditState) {
          throw new Error('scheduleEditState method not available')
        }
        result = await adapter.scheduleEditState({
          hostEntityType: item.hostEntityType,
          hostEntityUuid: item.hostEntityUuid,
          revisionLogMessage: revisionMessage.value,
          date: scheduleDate.value,
        })
      } else {
        // Publish immediately or save without publishing
        result = await adapter.publish!({
          hostEntityType: item.hostEntityType,
          hostEntityUuid: item.hostEntityUuid,
          closeAfterPublish: true,
          revisionLogMessage: revisionMessage.value,
          publishIfUnpublished: shouldPublish.value,
        })
      }

      let violations: Validation[] = []
      if (!result.success && result.state) {
        const mapped = adapter.mapState(result.state)
        if (mapped.mutatedState?.violations) {
          violations = mapped.mutatedState.violations
        }
      }
      mutationStatusItems.value[item.id] = {
        id: item.id,
        success: result.success,
        errors: result.errors,
        violations,
      }
      if (result.success) {
        publishedIds.value.push(item.id)
      }
      hasAnyError ||= !result.success
    } catch {
      mutationStatusItems.value[item.id] = {
        id: item.id,
        success: false,
        errors: [
          $t('unexpectedMutationError', 'An unexpected error happened.'),
        ],
      }
    }
  }

  isMutating.value = false

  if (hasAnyError) {
    return
  }

  if (publishMode.value === 'scheduled') {
    const formattedDate = ui.formatDate(scheduleDate.value)
    const message = $t(
      'publishScheduleSuccess',
      'Publication scheduled for @date',
    ).replace('@date', formattedDate)
    emitMessage(message, 'success')
    emit('close')
  } else {
    emit('submit')
  }
}
</script>
