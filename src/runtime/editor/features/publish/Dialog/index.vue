<template>
  <DialogModal
    id="publish"
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
            v-for="option in publishModeOptions"
            :id="option.id"
            :key="option.id"
            v-model="publishMode"
            :icon="option.icon"
            :color="option.color"
            :label="option.label"
            :description="option.description"
            :disabled="option.disabled"
          />
        </div>
      </FormItem>

      <FormItem v-if="publishMode === 'scheduled'">
        <div>
          <label class="bk-form-label">
            {{ $t('publishScheduleDate', 'Publication date') }}
          </label>
          <div class="bk-publish-schedule-date-wrapper">
            <div v-if="isAlreadyScheduled" class="bk-publish-scheduled-display">
              {{ formatScheduleDate(scheduleDate) }}
            </div>
            <ScheduleDate
              v-else
              v-model="scheduleDate"
              :disabled="isLoading"
              :error="scheduleDateError"
            >
              <div
                class="bk-schedule-date-info"
                v-text="
                  $t(
                    'publishScheduledInfo',
                    'You can still make changes until the scheduled publication date.',
                  )
                "
              />
            </ScheduleDate>
            <button
              v-if="isAlreadyScheduled"
              type="button"
              class="bk-button bk-is-danger"
              @click="removeScheduledDate"
            >
              {{ $t('publishRemoveSchedule', 'Remove schedule') }}
            </button>
          </div>
          <div v-if="isAlreadyScheduled" class="bk-form-description">
            {{
              $t(
                'publishAlreadyScheduledDescription',
                'This page is already scheduled for publishing',
              )
            }}
          </div>
        </div>
      </FormItem>

      <FormItem v-if="publishOptions?.hasRevisionLogMessage">
        <FormTextarea
          id="revision-message"
          v-model="revisionMessage"
          :label="$t('publishRevisionLogMessage', 'Change description')"
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

      <FormItem v-if="publishMode !== 'save' && scheduledBlocks.length">
        <InfoBox>
          <p
            v-for="(text, index) in scheduledBlocks"
            :key="'infobox' + index"
            v-html="text"
          />
        </InfoBox>
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
    </div>
    <template #pre-footer>
      <div>
        <h3 class="bk-form-label">
          {{ $t('publishSummary', 'Summary') }}
        </h3>
        <Summary
          :is-published="isCurrentlyPublished"
          :mode="publishMode"
          :current-state-label="currentStateLabel"
          :action-label="actionLabel"
          :result-state-label="resultStateLabel"
        />
      </div>
    </template>
  </DialogModal>
</template>

<script lang="ts" setup>
import {
  ref,
  computed,
  watch,
  useBlokkli,
  useAsyncData,
  onMounted,
  onUnmounted,
} from '#imports'
import {
  DialogModal,
  FormTextarea,
  FormItem,
  ScheduleDate,
  InfoBox,
} from '#blokkli/editor/components'
import { emitMessage } from '#blokkli/editor/events'
import Item from './Item.vue'
import PublishOption, { type PublishOptionProps } from './PublishOption.vue'
import Summary from './Summary.vue'
import type { MutationStatus } from './types'
import type { GetEditStatesItem } from '../types'

const showTable = false

const { adapter, $t, state, context, ui } = useBlokkli()

const formatScheduleDate = (date: string) => {
  return ui.formatDate(date, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const isMutating = ref(false)
const mutationStatusItems = ref<Record<string, MutationStatus>>({})
const publishedIds = ref<string[]>([])
const states = ref<string[]>([])
const revisionMessage = ref('')

// Reactive timestamp that updates every 30 seconds to revalidate scheduled date
const currentTimestamp = ref(Date.now())
let timestampInterval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  timestampInterval = setInterval(() => {
    currentTimestamp.value = Date.now()
  }, 30000) // Update every 30 seconds
})

onUnmounted(() => {
  if (timestampInterval) {
    clearInterval(timestampInterval)
  }
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

const scheduledBlocks = computed(() => {
  // Use the selected schedule date if in scheduled mode, otherwise use current time.
  const referenceTimestamp =
    publishMode.value === 'scheduled' && scheduleDate.value
      ? new Date(scheduleDate.value).getTime()
      : currentTimestamp.value

  const grouped = state
    .getAllUuids()
    .reduce<Record<string, number>>((acc, uuid) => {
      const item = state.getFieldListItem(uuid)
      if (!item?.editContext?.publishOn) {
        return acc
      }

      const publishDate = new Date(item.editContext.publishOn).getTime()
      if (publishDate <= referenceTimestamp) {
        return acc
      }

      const dateKey = item.editContext.publishOn
      acc[dateKey] = (acc[dateKey] || 0) + 1
      return acc
    }, {})

  return Object.entries(grouped).map(([date, count]) => {
    const formattedDate = formatScheduleDate(date)
    const message =
      count === 1
        ? $t(
            'publishScheduledBlockSingular',
            '1 block is scheduled to be published on @date',
          )
        : $t(
            'publishScheduledBlockPlural',
            '@count blocks are scheduled to be published on @date',
          )
    return message
      .replace('@count', count.toString())
      .replace('@date', `<strong>${formattedDate}</strong>`)
  })
})

/**
 * Whether scheduling is possible.
 */
const canSchedule = computed<boolean>(() => !!publishOptions.value?.canSchedule)

/**
 * The current schedule date/time as an ISO string.
 */
const publishOn = computed<string | null>(
  () => publishOptions.value?.publishOn ?? null,
)

/**
 * Whether this entity is already scheduled for publishing.
 */
const isAlreadyScheduled = computed(() => !!publishOn.value)

/**
 * Whether the current entity is published.
 */
const isCurrentlyPublished = computed(() => !!state.entity.value?.status)

/**
 * Available publish mode options.
 */
const publishModeOptions = computed<PublishOptionProps[]>(() => {
  const options: PublishOptionProps[] = [
    {
      id: 'save',
      icon: 'bk_mdi_save',
      color: 'red',
      label: $t('publishModeSaveTitle', 'Save'),
      description: $t(
        'publishModeSaveDescription',
        'Save changes without publishing',
      ),
      disabled: isCurrentlyPublished.value || isAlreadyScheduled.value,
    },
    {
      id: 'immediate',
      icon: 'bk_mdi_publish',
      color: 'lime',
      label: $t('publishModeImmediateTitle', 'Publish'),
      description: $t(
        'publishModeImmediateDescription',
        'Publish changes immediately',
      ),
      disabled: isAlreadyScheduled.value,
    },
  ]

  if (canSchedule.value) {
    options.push({
      id: 'scheduled',
      icon: 'bk_mdi_calendar_clock',
      color: 'yellow',
      label: $t('publishModeScheduledTitle', 'Schedule'),
      description: $t(
        'publishModeScheduledDescription',
        'Schedule changes for publishing',
      ),
      disabled: false,
    })
  }

  return options
})

/**
 * The selected schedule date/time.
 */
const scheduleDate = ref<string>(publishOn.value || '')

// Initialize revisionMessage from publish options
if (publishOptions.value?.revisionLogMessage) {
  revisionMessage.value = publishOptions.value.revisionLogMessage
}

// Initialize publishMode based on current state
if (!isCurrentlyPublished.value) {
  publishMode.value = 'save'
}

// Override with scheduled mode if there's an existing schedule
if (publishOn.value) {
  publishMode.value = 'scheduled'
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
      filters: [],
    })
  },
  {
    default: () => {
      return {
        items: [],
        perPage: 16,
        total: 0,
        filters: [],
      }
    },
  },
)

const currentId = computed(
  () => `${context.value.entityType}:${context.value.entityUuid}`,
)

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

const scheduleDateError = computed(() => {
  if (publishMode.value !== 'scheduled' || !scheduleDate.value) {
    return ''
  }

  const selectedDateTime = new Date(scheduleDate.value)
  // Use currentTimestamp to make this reactive to time passing
  const minDateTime = new Date(currentTimestamp.value + 2 * 60 * 1000) // 2 minutes from now

  if (selectedDateTime < minDateTime) {
    return $t(
      'publishScheduleDateTooSoon',
      'The scheduled date must be at least 2 minutes in the future',
    )
  }

  return ''
})

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
  if (scheduleDateError.value) {
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
    return $t(
      'publishResultSaveChanges',
      'Changes are saved, page remains unpublished',
    )
  }
  if (publishMode.value === 'scheduled' && scheduleDate.value) {
    const formattedDate = formatScheduleDate(scheduleDate.value)
    if (isCurrentlyPublished.value) {
      return $t(
        'publishResultScheduledChanges',
        'Changes will be published on @date',
      ).replace('@date', formattedDate)
    }
    return $t(
      'publishResultScheduledPage',
      'Page will be published on @date',
    ).replace('@date', formattedDate)
  }
  if (isCurrentlyPublished.value) {
    return $t(
      'publishResultPublishChangesRemainPublished',
      'Changes are published, page remains published',
    )
  }
  return $t(
    'publishResultPublishChangesNowPublished',
    'Changes are published, page is now published',
  )
})

async function removeScheduledDate() {
  if (!adapter.unscheduleEditState) {
    return
  }

  isMutating.value = true

  // Store the current schedule date to restore it after removal
  const previousScheduleDate = scheduleDate.value

  const success = await state.mutateWithLoadingState(() =>
    adapter.unscheduleEditState!({
      hostEntityType: context.value.entityType,
      hostEntityUuid: context.value.entityUuid,
    }),
  )

  if (success) {
    await refresh()
    scheduleDate.value = previousScheduleDate
  }
  isMutating.value = false
}

async function onSubmit() {
  // Update timestamp to ensure validation is correct
  currentTimestamp.value = Date.now()

  // Validate scheduled date before submitting
  if (scheduleDateError.value) {
    return
  }

  isMutating.value = true

  const items = stateItems.value

  const hasAnyError = false

  let mutationResult = false
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
      if (publishMode.value === 'scheduled') {
        // Schedule the edit state for later publishing
        if (!adapter.scheduleEditState) {
          throw new Error('scheduleEditState method not available')
        }
        mutationResult = await state.mutateWithLoadingState(() =>
          adapter.scheduleEditState!({
            hostEntityType: item.hostEntityType,
            hostEntityUuid: item.hostEntityUuid,
            revisionLogMessage: revisionMessage.value,
            date: scheduleDate.value,
          }),
        )
      } else {
        // Publish immediately or save without publishing
        mutationResult = await state.mutateWithLoadingState(() =>
          adapter.publish!({
            hostEntityType: item.hostEntityType,
            hostEntityUuid: item.hostEntityUuid,
            closeAfterPublish: true,
            revisionLogMessage: revisionMessage.value,
            publishIfUnpublished: shouldPublish.value,
          }),
        )
      }
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

  if (hasAnyError || !mutationResult) {
    return
  }

  if (publishMode.value === 'scheduled') {
    const formattedDate = formatScheduleDate(scheduleDate.value)
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

watch(
  () => [revisionMessage.value, publishMode.value, isMutating.value],
  () => {
    ui.requireDialogCloseConfirm()
  },
  {
    once: true,
  },
)
</script>
