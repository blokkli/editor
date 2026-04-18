<template>
  <Teleport :to="ui.mainLayoutElement.value">
    <BlokkliTransition name="slide-up">
      <PublishDialog v-if="showDialog" @close="onClose" @submit="onSubmit" />
    </BlokkliTransition>
  </Teleport>
</template>

<script lang="ts" setup>
import {
  useBlokkli,
  defineBlokkliFeature,
  computed,
  useRoute,
  nextTick,
} from '#imports'
import type { BlokkliIcon } from '#blokkli-build/icons'
import { BlokkliTransition } from '#blokkli/editor/components'
import PublishDialog from './Dialog/index.vue'
import {
  defineMenuButton,
  onBlokkliEvent,
  useDialog,
} from '#blokkli/editor/composables'

const { adapter, settings } = defineBlokkliFeature({
  id: 'publish',
  icon: 'bk_mdi_publish',
  label: 'Publish',
  requiredAdapterMethods: ['publish'],
  description:
    'Provides a menu button to publish the changes of the current entity.',
  settings: {
    closeAfterPublish: {
      type: 'checkbox',
      label: 'Close editor after publishing',
      description:
        'Immediately closes the editor after successfully publishing or saving.',
      default: true,
      group: 'behavior',
    },
  },
})

const route = useRoute()
const { state, $t, broadcast, context, eventBus, ui } = useBlokkli()
const { mutations, canEdit, mutateWithLoadingState } = state

const hasPublishOptions = !!adapter.getPublishOptions

const isPublished = computed<boolean>(() => !!state.entity.value.status)

const isScheduled = computed<boolean>(
  () => !!state.publishOptions.value.publishOn,
)

const showDialog = useDialog('publish', 'center')

const publishLabel = computed(() => {
  const suffix = hasPublishOptions ? '...' : ''

  // Check if there's a scheduled publication
  if (isScheduled.value) {
    return $t('publishManageSchedule', 'Manage scheduling') + suffix
  }

  // Entity is published. Clicking the button will make the changes go "live".
  if (isPublished.value) {
    return (
      (settings.value.closeAfterPublish
        ? $t('publishAndCloseLabel', 'Publish & Close')
        : $t('publishLabel', 'Publish')) + suffix
    )
  }

  return (
    (settings.value.closeAfterPublish
      ? $t('publishAndCloseLabelUnpublished', 'Save & Close')
      : $t('publishLabelUnpublished', 'Save')) + suffix
  )
})

const publishDescription = computed(() => {
  if (isScheduled.value) {
    return $t(
      'publishDescriptionScheduled',
      'View or change the scheduled publication',
    )
  }
  return isPublished.value
    ? $t('publishDescription', 'Publish all changes.')
    : $t(
        'publishDescriptionUnpublished',
        'Save all changes while keeping page unpublished',
      )
})

const icon = computed<BlokkliIcon>(() => {
  if (state.publishOptions.value?.publishOn) {
    return 'bk_mdi_calendar_clock'
  }
  return isPublished.value ? 'bk_mdi_publish' : 'bk_mdi_save'
})

const onMenuClick = async () => {
  if (hasPublishOptions) {
    showDialog.value = true
    return
  }

  await publishCurrent()
}

async function publishCurrent() {
  const success = await mutateWithLoadingState(
    () =>
      adapter.publish({
        hostEntityType: context.value.entityType,
        hostEntityUuid: context.value.entityUuid,
        closeAfterPublish: settings.value.closeAfterPublish,
      }),
    $t('publishError', 'Changes could not be published.'),
    $t('publishSuccess', 'Changes published successfully.'),
  )

  if (!success) {
    const validations = state.violations.value
    if (validations.length) {
      eventBus.emit('publish:failed')
      // Open the validations sidebar when there are validation errors.
      eventBus.emit('sidebar:open', 'violations')
    }
    return
  }

  onSubmit()
}

function onSubmit() {
  broadcast.emit('published', { uuid: context.value.entityUuid })

  if (settings.value.closeAfterPublish) {
    window.location.href = route.path
  }
}

async function onClose() {
  await nextTick()
  showDialog.value = false
}

onBlokkliEvent('publish:show-dialog', () => {
  showDialog.value = true
})

defineMenuButton(() => {
  return {
    id: 'publish',
    title: publishLabel.value,
    description: publishDescription.value,
    icon: icon.value,
    type: isScheduled.value ? 'yellow' : 'success',
    disabled: !mutations.value.length || !canEdit.value,
    weight: 0,
    callback: onMenuClick,
  }
})
</script>

<script lang="ts">
export default {
  name: 'Publish',
}
</script>

<style lang="postcss">
.bk {
  .bk-publish-dialog-table {
    td,
    th {
      &:nth-child(n + 2) {
        @apply text-right whitespace-nowrap pl-18;
      }

      &:first-child {
        @apply w-full;
      }
    }

    tr:has(input:checked) td {
      @apply bg-mono-100;
    }

    tr.bk-is-success {
      td {
        @apply !bg-lime-light/40;
      }

      input:checked + span {
        &:before {
          @apply !bg-lime-normal/50;
        }
      }
    }

    tr.bk-is-error {
      td {
        @apply !bg-red-normal/10;
      }

      input:checked + span {
        &:before {
          @apply !bg-red-normal/90;
        }
      }
    }

    td.bk-is-status {
      > div {
        @apply w-[60px];
        @apply flex items-center justify-end gap-10;
      }
    }

    tbody {
      td:first-child {
        @apply pl-3;
      }
    }

    .bk-icon-arrow-right-thin svg {
      @apply size-15;
    }

    .bk-icon-loader svg {
      @apply w-30 h-30 fill-mono-500 mr-15;
    }
  }
  .bk-publish-dialog-table + .bk-publish-dialog-table {
    @apply mt-40;
  }

  .bk-dialog-publish-form {
    @apply flex flex-col;

    min-height: calc(100vh - 500px);
    .bk-heading-2 {
      @apply font-bold text-xl mb-10;
    }
  }

  .bk-publish-options {
    @apply grid grid-cols-3 gap-10 my-20;
  }

  .bk-publish-option {
    @apply relative grid grid-cols-[auto_1fr] gap-15 items-center leading-none cursor-pointer hyphens-auto;

    &.bk-is-disabled {
      @apply pointer-events-none;
      .bk-publish-option-icon {
        @apply !border-mono-300 !text-mono-300;
      }

      .bk-publish-option-label {
        @apply text-mono-300;
      }

      .bk-publish-option-description {
        @apply text-mono-300;
      }
    }

    input {
      @apply appearance-none absolute top-0 left-0 opacity-0;
    }
    &:has(input:checked) {
      .bk-publish-option-label {
        @apply text-mono-950;
      }
      .bk-publish-option-icon-check {
        @apply visible;
      }
    }

    &.bk-is-red {
      .bk-publish-option-icon {
        @apply border-red-normal text-red-normal;
      }
      &:hover {
        .bk-publish-option-icon {
          @apply bg-red-light;
        }
      }
      &:has(input:checked) {
        .bk-publish-option-icon {
          @apply bg-red-normal text-red-light border-red-dark;
          @apply ring-4 ring-red-normal/30;
          @apply outline outline-[1px] outline-red-dark/60;
        }
      }
    }

    &.bk-is-yellow {
      .bk-publish-option-icon {
        @apply border-yellow-normal text-yellow-normal;
      }
      &:hover {
        .bk-publish-option-icon {
          @apply bg-yellow-light;
        }
      }
      &:has(input:checked) {
        .bk-publish-option-icon {
          @apply bg-yellow-normal text-yellow-dark;
          @apply ring-4 ring-yellow-normal/30;
          @apply outline outline-[1px] outline-yellow-dark/70;
        }
      }
    }

    &.bk-is-lime {
      .bk-publish-option-icon {
        @apply border-lime-normal text-lime-normal;
      }
      &:hover {
        .bk-publish-option-icon {
          @apply bg-lime-light;
        }
      }
      &:has(input:checked) {
        .bk-publish-option-icon {
          @apply outline outline-4 outline-lime-normal/30 bg-lime-normal text-white;
          @apply ring-4 ring-lime-normal/30;
          @apply outline outline-[1px] outline-lime-dark;
        }
      }
    }
  }

  .bk-publish-option-icon {
    @apply border rounded-full flex items-center justify-center gap-10 relative;
    @apply size-[60px];

    > .bk-icon {
      @apply size-30;
      svg {
        @apply size-full fill-current;
      }
    }
  }

  .bk-publish-option-icon-check {
    @apply absolute top-[-1px] right-[-9px] invisible flex items-center justify-center;
    @apply size-20;
    @apply bg-mono-950;
    @apply rounded-full;

    .bk-icon {
      svg {
        @apply size-[13px] text-white fill-current;
      }
    }
  }

  .bk-publish-option-label {
    @apply font-bold text-lg !leading-none;
  }
  .bk-publish-option-description {
    @apply text-mono-600 text-sm mt-3 leading-tight text-balance;
  }

  .bk-publish-schedule-date-wrapper {
    @apply flex gap-20 items-stretch;

    .bk-publish-scheduled-display {
      @apply flex-1 flex items-center font-bold text-xl;
      @apply bg-yellow-light text-yellow-dark pl-10 rounded-md;
      @apply border border-yellow-normal;
      @apply tabular-nums;
    }

    .bk-button {
      @apply whitespace-nowrap shrink;
    }
  }

  .bk-schedule-date {
    @apply flex-1 flex gap-20;
  }

  .bk-schedule-date-picker {
    @apply w-[300px] shrink-0;
  }

  .bk-schedule-date-time {
    @apply flex-1;

    .bk-form-label {
      @apply mb-5;
    }

    input[type='time'] {
      @apply w-full tabular-nums;
    }
  }

  .bk-schedule-date-time-input {
    @apply flex gap-10 items-stretch;

    input[type='time'] {
      @apply flex-1;
    }

    .bk-schedule-date-time-button {
      @apply shrink-0 px-10;

      .bk-icon {
        @apply size-15;
        svg {
          @apply size-full fill-current;
        }
      }
    }
  }

  .bk-schedule-date-formatted {
    @apply mb-20 px-10 font-bold text-lg rounded-md;
    /* @apply border border-mono-300; */
    @apply bg-mono-100;
    @apply h-[52px] flex items-center;
  }

  .bk-schedule-date-info {
    @apply mt-20 p-10 bg-yellow-light text-yellow-dark border border-yellow-normal/60 rounded-md font-medium;
    @apply text-sm text-pretty;
  }

  .bk-publish-summary {
    @apply flex items-center justify-between;
  }

  .bk-publish-summary-state,
  .bk-publish-summary-action {
    @apply flex items-center gap-5 relative justify-center;

    &:nth-child(1),
    &:nth-child(2) {
      &:after {
        content: '';
      }
    }
  }
  .bk-publish-summary-state {
    &:last-child {
      @apply border rounded-full pr-10;
      .bk-publish-summary-state-label {
        @apply pr-5 font-semibold leading-none;
      }

      svg {
        @apply size-15;
      }
      .bk-icon {
        @apply size-25 rounded-full flex items-center justify-center bg-white;
      }

      &.bk-is-published {
        @apply bg-lime-normal border-lime-normal;
        .bk-icon {
          svg {
            @apply fill-lime-normal;
          }
        }
        .bk-publish-summary-state-label {
          @apply text-white;
        }
      }
      &.bk-is-unpublished {
        @apply bg-red-normal border-red-normal;
        .bk-icon svg {
          @apply fill-red-normal;
        }
        .bk-publish-summary-state-label {
          @apply text-white;
        }
      }
    }
  }

  .bk-publish-summary-state-icon,
  .bk-publish-summary-action-icon {
    @apply size-25 rounded-full flex items-center justify-center border;

    .bk-icon {
      @apply size-15;
      svg {
        @apply size-full fill-current;
      }
    }
  }

  .bk-publish-summary-state-icon {
    &.bk-is-published {
      @apply border-lime-normal text-lime-normal;
    }

    &.bk-is-unpublished {
      @apply border-red-normal text-red-normal;
    }
  }

  .bk-publish-summary-state-label,
  .bk-publish-summary-action-label {
    @apply text-sm font-medium text-mono-700 text-center;
  }

  .bk-publish-summary-arrow {
    @apply flex items-center;
    .bk-icon {
      @apply size-20;
      svg {
        @apply size-full fill-mono-700;
      }
    }
  }

  .bk-publish-summary-action-icon {
    &.bk-is-save {
      @apply bg-red-normal border-red-dark text-white;
    }

    &.bk-is-scheduled {
      @apply bg-yellow-normal border-yellow-dark text-yellow-dark;
    }

    &.bk-is-publish {
      @apply bg-lime-normal border-lime-dark text-white;
    }
  }

  .bk-schedule-date-error {
    @apply mt-20 p-10 bg-red-light text-red-dark border border-red-normal/60 rounded-md font-medium;
    @apply text-sm text-pretty;
  }
}
.bk.bk-is-publish-dialog {
  .bk-dialog-content {
    .bk-dialog-content-inner {
      @apply pb-0;
    }
  }
  .bk-dialog-footer {
    @apply mt-0;
  }
  .bk-form-item {
    @apply py-20 first:pt-0;
  }
}
</style>
