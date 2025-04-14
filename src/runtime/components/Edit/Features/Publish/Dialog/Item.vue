<template>
  <tr
    :class="{
      'bk-is-success': isSuccess,
      'bk-is-error': isError,
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
        <div v-if="isCurrent" class="bk-pill">Aktuelle Seite</div>
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
            'bk-is-success': newStatus.status,
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
              'bk-is-success': newStatus.status,
            }"
          />
        </template>
      </div>
    </td>
  </tr>
</template>

<script lang="ts" setup>
import { computed } from '#imports'
import { Icon } from '#blokkli/components'
import type { GetEditStatesItem } from '#blokkli/types'
import type { MutationStatus } from './types'

const props = defineProps<
  GetEditStatesItem & {
    id: string
    isCurrent: boolean
    shouldPublish: boolean
    isMutating: boolean
    mutationStatus?: MutationStatus
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
    if (props.entity.status && props.shouldPublish) {
      return 'Erfolgreich publiziert'
    } else {
      return 'Erfolgreich gespeichert'
    }
  }

  return null
})

const isCurrentlyPublished = computed(() => props.entity.status)

const title = computed(() => props.entity.label)
const bundleLabel = computed(() => props.entity.bundleLabel)

const newStatus = computed(() => {
  if (isSelected.value && isCurrentlyPublished.value && !props.shouldPublish) {
    return { label: 'bleibt publiziert', status: true }
  } else if (
    isSelected.value &&
    !isCurrentlyPublished.value &&
    props.shouldPublish
  ) {
    return { label: 'wird publiziert', status: true }
  } else if (isSelected.value && isCurrentlyPublished.value) {
    return { label: 'bleibt publiziert', status: true }
  } else if (isSelected.value && !isCurrentlyPublished.value) {
    return { label: 'bleibt unpubliziert', status: false }
  }
  return { label: '', status: false }
})
</script>
