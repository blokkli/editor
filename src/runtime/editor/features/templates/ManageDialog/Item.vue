<template>
  <tr>
    <td>
      <div>
        <span>{{ label }}</span>
        <span
          v-if="isDefault"
          class="bk-pill bk-is-strong"
          :title="
            $t(
              'templatesDefaultPillDescription',
              'This template is used when new blocks of this type are created.',
            )
          "
          >{{ $t('templatesDefaultPill', 'Default') }}</span
        >
      </div>
      <div v-if="description">{{ description }}</div>
      <ul class="bk-pill-list">
        <li v-for="(bundle, index) in bundleLabels" :key="index">
          <span class="bk-pill bk-is-mono" v-text="bundle" />
        </li>
      </ul>
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
      <div>
        <template v-if="confirmDelete">
          <button
            class="bk-button bk-is-danger bk-is-small"
            :disabled="isDeleting"
            :class="{ 'bk-is-loading': isDeleting }"
            @click="onConfirmDelete"
          >
            {{ $t('templatesManageDialogConfirmDelete', 'Delete') }}
          </button>
          <button
            class="bk-button bk-is-small"
            :disabled="isDeleting"
            @click="confirmDelete = false"
          >
            {{ $t('templatesManageDialogCancelDelete', 'Cancel') }}
          </button>
        </template>
        <template v-else>
          <button
            v-if="adapterHasEdit && permissions.includes('edit')"
            ref="editButtonEl"
            class="bk-button bk-is-small"
            @click.prevent="isEditing = true"
          >
            <Icon name="bk_mdi_edit" />
            {{ $t('templatesManageDialogEdit', 'Edit') }}
          </button>
          <button
            v-if="permissions.includes('delete')"
            class="bk-button bk-is-small"
            @click="confirmDelete = true"
          >
            <Icon name="bk_mdi_delete" />
            {{ $t('templatesManageDialogDelete', 'Delete') }}
          </button>
        </template>
      </div>
    </td>
  </tr>
  <NestedEditorOverlay
    v-if="isEditing && editUrl"
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
