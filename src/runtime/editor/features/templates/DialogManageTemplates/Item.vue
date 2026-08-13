<template>
  <tr class="hover:bg-mono-50">
    <td class="py-15">
      <div class="flex flex-wrap gap-5">
        <span class="text-lg font-semibold items-center">{{ label }}</span>
        <div v-if="isDefault">
          <Pill
            :text="$t('templatesDefaultPill', 'Default')"
            variant="normal"
            :title="
              $t(
                'templatesDefaultPillDescription',
                'This template is used when new blocks of this type are created.',
              )
            "
          />
        </div>
      </div>
      <div v-if="description" class="text-sm text-mono-600">
        {{ description }}
      </div>
      <div class="bk-pill-list mt-8">
        <Pill
          v-for="(bundle, index) in bundleLabels"
          :key="index"
          :text="bundle"
          scheme="mono"
        />
      </div>
    </td>
    <td>
      <span v-if="metadata?.createdBy">{{ metadata.createdBy }}</span>
    </td>
    <td>
      <RelativeTime v-if="dateCreated" :timestamp="dateCreated" />
    </td>
    <td>
      <RelativeTime v-if="dateUpdated" :timestamp="dateUpdated" />
    </td>
    <td class="bk-templates-manage-table-actions">
      <div class="flex gap-10 justify-end">
        <template v-if="confirmDelete">
          <button
            class="bk-button bk-scheme-red bk-is-small"
            :disabled="isDeleting"
            :class="{ 'bk-is-loading': isDeleting }"
            @click="onConfirmDelete"
          >
            {{ $t('delete', 'Delete') }}
          </button>
          <button
            class="bk-button bk-scheme-mono bk-is-light bk-is-small"
            :disabled="isDeleting"
            @click="confirmDelete = false"
          >
            {{ $t('cancel', 'Cancel') }}
          </button>
        </template>
        <template v-else>
          <button
            v-if="permissions.includes('delete')"
            class="bk-button bk-scheme-red bk-is-light bk-is-small bk-is-icon-only"
            @click="confirmDelete = true"
          >
            <Icon name="bk_mdi_delete" />
          </button>
          <button
            v-if="adapterHasEdit && permissions.includes('edit')"
            ref="editButtonEl"
            class="bk-button bk-scheme-accent bk-is-small bk-is-icon-only"
            @click.prevent="isEditing = true"
          >
            <Icon name="bk_mdi_edit" />
          </button>
        </template>
      </div>
    </td>
  </tr>
  <NestedEditorOverlay
    v-if="isEditing && editUrl"
    id="edit-template"
    :url="editUrl"
    :uuid
    :element="editButtonEl"
    :title="$t('templatesEditOverlayTitle', 'Edit template')"
    theme="red"
    icon="bk_mdi_dashboard"
    @close="isEditing = false"
    @submit="onSubmitEdit"
  />
</template>

<script setup lang="ts">
import { computed, ref, useBlokkli, useTemplateRef } from '#imports'
import type { TemplateItem } from '../types'
import {
  Icon,
  NestedEditorOverlay,
  RelativeTime,
  Pill,
} from '#blokkli/editor/components'
import { falsy, onlyUnique } from '#blokkli/helpers'

const props = defineProps<TemplateItem>()

const emit = defineEmits<{
  (e: 'refresh'): void
}>()

const { $t, adapter, state, types } = useBlokkli()

const editButtonEl = useTemplateRef('editButtonEl')

const confirmDelete = ref(false)
const isDeleting = ref(false)
const isEditing = ref(false)

const dateCreated = computed(() => props.metadata?.dateCreated)
const dateUpdated = computed(() => props.metadata?.dateUpdated)

const editUrl = computed(() => {
  if (!adapter.templatesGetEditUrl) {
    return null
  }
  return adapter.templatesGetEditUrl({ templateUuid: props.uuid })
})

function onSubmitEdit() {
  isEditing.value = false
}

const adapterHasEdit = !!adapter.templatesGetEditUrl

const bundleLabels = computed(() =>
  props.itemBundles
    .map((bundle) => {
      return types.getBlockBundleDefinition(bundle)?.label
    })
    .filter(falsy)
    .filter(onlyUnique),
)

async function onConfirmDelete() {
  if (!adapter.templatesDelete) {
    return
  }

  isDeleting.value = true

  const success = await state.mutateWithLoadingState(
    () => adapter.templatesDelete!({ templateUuid: props.uuid }),
    $t('templatesDeleteError', 'Failed to delete template.'),
    $t('templatesDeleteSuccess', 'Template deleted successfully.'),
  )

  if (success) {
    emit('refresh')
    return
  }

  isDeleting.value = false
  confirmDelete.value = false
}
</script>
