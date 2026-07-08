<template>
  <tr
    :class="{
      'bk-is-success': isSuccess,
      'bk-is-error': isError,
      'bk-is-warning': isScheduled && isSelected && !isSuccess,
    }"
  >
    <td
      class="w-full pl-3"
      :class="{
        'bg-red-normal/10!': isError,
        'bg-lime-light/40!': isSuccess,
        'bg-mono-100': !isError && !isSuccess && isSelected,
      }"
    >
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
        <Pill
          v-if="isCurrent"
          :text="$t('publishCurrentPage', 'Current page')"
        />
      </label>
    </td>
    <td
      class="text-right whitespace-nowrap pl-18"
      :class="{
        'bg-red-normal/10!': isError,
        'bg-lime-light/40!': isSuccess,
        'bg-mono-100': !isError && !isSuccess && isSelected,
      }"
    >
      <span v-if="mutationStatusLabel">{{ mutationStatusLabel }}</span>
      <span v-else-if="isSelected">{{ newStatus.label }}</span>
    </td>
    <td
      class="text-right whitespace-nowrap pl-18 [&>div]:w-[60px] [&>div]:flex [&>div]:items-center [&>div]:justify-end [&>div]:gap-10"
      :class="{
        'bg-red-normal/10!': isError,
        'bg-lime-light/40!': isSuccess,
        'bg-mono-100': !isError && !isSuccess && isSelected,
      }"
    >
      <div v-if="isSuccess">
        <StatusIndicator :status="newStatusPropValue" />
      </div>
      <div v-else-if="isSelected && isMutating">
        <Icon
          name="loader"
          class="[&_svg]:size-30 [&_svg]:fill-mono-500 mr-15"
        />
      </div>
      <div v-else-if="isSelected">
        <StatusIndicator :status="isCurrentlyPublished ? 'success' : 'error'" />
        <template v-if="newStatus.status !== isCurrentlyPublished">
          <Icon name="arrow-right-thin" class="[&_svg]:size-15" />
          <StatusIndicator :status="newStatusPropValue" />
        </template>
      </div>
    </td>
  </tr>
</template>

<script lang="ts" setup>
import { computed, useBlokkli } from '#imports'
import { Icon, StatusIndicator, Pill } from '#blokkli/editor/components'
import type { MutationStatus } from './types'
import type { GetEditStatesItem } from '../types'

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

const newStatusPropValue = computed<'success' | 'warning' | 'error'>(() => {
  if (newStatus.value.status === true) {
    return 'success'
  } else if (newStatus.value.status === 'scheduled') {
    return 'warning'
  }
  return 'error'
})
</script>

<style lang="postcss">
.bk {
  /*
   * Override the checkbox indicator color when the row is in a success/error
   * state. Targets the global `.bk-checkbox` `input:checked + span:before`
   * pseudo-element, which can't be addressed via Tailwind utilities.
   */
  tr.bk-is-success input:checked + span:before {
    @apply bg-lime-normal/50!;
  }

  tr.bk-is-error input:checked + span:before {
    @apply bg-red-normal/90!;
  }
}
</style>
