<template>
  <tr
    :class="{
      'bk-is-success': isSuccess,
      'bk-is-error': isError,
      'bk-is-warning': isScheduled && isSelected && !isSuccess,
    }"
  >
    <td>
      <label class="bk-checkbox">
        <input
          v-if="isCurrent || isMutating || isSuccess"
          :checked="isSelected"
          type="checkbox"
          disabled
        />
        <input v-else v-model="modelValue" type="checkbox" :value="id" />
        <span />

        <div>
          <div>
            <strong>{{ title }}</strong>
          </div>
          <div>
            {{ bundleLabel }}
          </div>
        </div>
        <div v-if="isCurrent" class="bk-pill">
          {{ $t('publishCurrentPage', 'Current page') }}
        </div>
      </label>
    </td>
    <td>
      <span v-if="mutationStatusLabel">{{ mutationStatusLabel }}</span>
      <span v-else-if="isSelected">{{ newStatus.label }}</span>
    </td>
    <td class="bk-is-status">
      <div v-if="isSuccess">
        <span
          class="bk-status-indicator"
          :class="{
            'bk-is-success': newStatus.status === true,
            'bk-is-warning': newStatus.status === 'scheduled',
          }"
        />
      </div>
      <div v-else-if="isSelected && isMutating">
        <Icon name="loader" />
      </div>
      <div v-else-if="isSelected">
        <span
          class="bk-status-indicator"
          :class="{
            'bk-is-success': isCurrentlyPublished,
          }"
        />
        <template v-if="newStatus.status !== isCurrentlyPublished">
          <Icon name="arrow-right-thin" />
          <span
            class="bk-status-indicator"
            :class="{
              'bk-is-success': newStatus.status === true,
              'bk-is-warning': newStatus.status === 'scheduled',
            }"
          />
        </template>
      </div>
    </td>
  </tr>
</template>

<script lang="ts" setup>
import { computed, useBlokkli } from '#imports'
import { Icon } from '#blokkli/components'
import type { GetEditStatesItem } from '#blokkli/types'
import type { MutationStatus } from './types'

const { $t } = useBlokkli()

const props = defineProps<
  GetEditStatesItem & {
    id: string
    isCurrent: boolean
    shouldPublish: boolean
    isMutating: boolean
    mutationStatus?: MutationStatus
    isScheduled: boolean
    scheduleDate: string
  }
>()

const modelValue = defineModel<string[]>({
  default: () => {
    return []
  },
})

const isSelected = computed(
  () => props.isCurrent || modelValue.value.includes(props.id),
)

const isSuccess = computed(() => props.mutationStatus?.success)

const isError = computed(
  () =>
    !isSuccess.value &&
    !!(
      props.mutationStatus?.errors?.length ||
      props.mutationStatus?.violations?.length
    ),
)

const mutationStatusLabel = computed(() => {
  if (isSuccess.value) {
    if (props.isScheduled) {
      return $t('publishPublicationScheduled', 'Publication scheduled')
    } else if (props.entity.status && props.shouldPublish) {
      return $t('publishSuccessfullyPublished', 'Successfully published')
    } else {
      return $t('publishSuccessfullySaved', 'Successfully saved')
    }
  }

  return null
})

const isCurrentlyPublished = computed(() => props.entity.status)

const title = computed(() => props.entity.label)
const bundleLabel = computed(() => props.entity.bundleLabel)

const newStatus = computed(() => {
  if (isSelected.value && props.isScheduled) {
    return {
      label: $t('publishWillBeScheduled', 'Will be scheduled'),
      status: 'scheduled' as const,
    }
  } else if (
    isSelected.value &&
    isCurrentlyPublished.value &&
    !props.shouldPublish
  ) {
    return {
      label: $t('publishRemainsPublished', 'Remains published'),
      status: true,
    }
  } else if (
    isSelected.value &&
    !isCurrentlyPublished.value &&
    props.shouldPublish
  ) {
    return {
      label: $t('publishWillBePublished', 'Will be published'),
      status: true,
    }
  } else if (isSelected.value && isCurrentlyPublished.value) {
    return {
      label: $t('publishRemainsPublished', 'Remains published'),
      status: true,
    }
  } else if (isSelected.value && !isCurrentlyPublished.value) {
    return {
      label: $t('publishRemainsUnpublished', 'Remains unpublished'),
      status: false,
    }
  }
  return { label: '', status: false }
})
</script>
