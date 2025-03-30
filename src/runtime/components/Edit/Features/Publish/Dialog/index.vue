<template>
  <DialogModal
    :title="$t('publishDialogTitle', 'Publish changes')"
    :width="1200"
    :submit-label
    :is-loading="isLoading"
    :can-submit="!!selectedToPublishItems.length"
    @submit="onSubmit"
    @cancel="$emit('close')"
    class="bk-is-publish-dialog"
  >
    <div class="bk bk-form bk-dialog-publish-form">
      <FormGroup title="Einstellungen" horizontal>
        <FormItem v-if="publishOptions?.hasRevisionLogMessage">
          <FormTextarea
            v-model="revisionMessage"
            label="Protokollnachricht der Revision"
            description="Beschreiben Sie kurz die vorgenommenen Änderungen"
            :disabled="isLoading"
          />
        </FormItem>
        <FormItem>
          <FormToggle
            v-model="shouldPublish"
            :label="toggleLabel"
            :disabled="isLoading"
          />
        </FormItem>
      </FormGroup>

      <FormGroup title="Inhalte" horizontal>
        <FormItem>
          <template v-if="successItems.length">
            <h2 class="bk-heading-2">Erfolgreich veröffentlicht</h2>

            <table class="bk-table bk-publish-dialog-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th colspan="2">Status</th>
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
                />
              </tbody>
            </table>
          </template>

          <table class="bk-table bk-publish-dialog-table">
            <thead>
              <tr>
                <th>Name</th>
                <th colspan="2">Status</th>
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
              />
            </tbody>
          </table>
        </FormItem>
      </FormGroup>
    </div>
  </DialogModal>
</template>

<script lang="ts" setup>
import { ref, computed, useBlokkli, useAsyncData } from '#imports'
import {
  DialogModal,
  FormToggle,
  FormTextarea,
  FormItem,
  FormGroup,
} from '#blokkli/components'
import type { GetEditStatesItem, Validation } from '#blokkli/types'
import { falsy } from '#blokkli/helpers'
import Item from './Item.vue'
import type { MutationStatus } from './types'

const { adapter, $t, state, context } = useBlokkli()

const isMutating = ref(false)

const mutationStatusItems = ref<Record<string, MutationStatus>>({})

const publishedIds = ref<string[]>([])

const shouldPublish = defineModel<boolean>('shouldPublish', {
  default: () => false,
})

const states = defineModel<string[]>('states', {
  default: () => [],
})

const revisionMessage = defineModel<string>('revisionMessage', {
  default: () => false,
})

const emit = defineEmits<{
  (e: 'close' | 'submit'): void
}>()

const { data: publishOptions, status } = await useAsyncData(() => {
  return adapter.getPublishOptions!()
})

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
    ...editStates.value.items.map((v) => {
      return {
        ...v,
        id: `${v.hostEntityType}:${v.hostEntityUuid}`,
      }
    }),
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

const submitLabelPublish = computed(() => {
  if (shouldPublish.value) {
    const count = 1 + states.value.length
    return '@count Inhalte publizieren'.replace('@count', count.toString())
  }
  return null
})

const submitLabelSave = computed(() => {
  const count = selectedToPublishItems.value.length
  if (!count) {
    if (shouldPublish.value) {
      return 'Inhalte publizieren'
    }
    return 'Inhalte speichern'
  }
  if (!shouldPublish.value) {
    return '@count Inhalte speichern'.replace('@count', count.toString())
  }
  return null
})

const submitLabel = computed(() => {
  return [submitLabelPublish.value, submitLabelSave.value]
    .filter(falsy)
    .join(', ')
})

const toggleLabel = computed(() => {
  if (states.value.length) {
    return 'Inhalte publizieren'
  }

  return 'Inhalt publizieren'
})

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
      const result = await adapter.publish!({
        hostEntityType: item.hostEntityType,
        hostEntityUuid: item.hostEntityUuid,
        closeAfterPublish: true,
        revisionLogMessage: revisionMessage.value,
        publishIfUnpublished: shouldPublish.value,
      })

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

  emit('submit')
}
</script>
