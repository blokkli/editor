<template>
  <DialogModal
    id="templates-manage"
    :title="$t('templatesManageDialogTitle', 'Manage templates')"
    :lead="
      $t(
        'templatesManageDialogLead',
        'View, edit and delete your block templates.',
      )
    "
    :width="800"
    icon="bk_mdi_dashboard"
    hide-buttons
    @cancel="$emit('cancel')"
  >
    <div ref="dialogEl" class="bk-templates-manage">
      <Loading v-if="status === 'pending'" />
      <template v-else-if="items.length">
        <table class="bk-table">
          <thead>
            <tr>
              <th>{{ $t("templatesManageDialogLabelColumn", "Name") }}</th>
              <th>
                {{
                  $t("templatesManageDialogDescriptionColumn", "Description")
                }}
              </th>
              <th>
                {{ $t("templatesManageDialogColumnActions", "Actions") }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in items" :key="item.uuid">
              <td>{{ item.label }}</td>
              <td>{{ item.description || "-" }}</td>
              <td class="bk-templates-manage-table-actions">
                <div>
                  <template v-if="confirmDeleteUuid === item.uuid">
                    <button
                      class="bk-button bk-is-danger bk-is-small"
                      :disabled="isDeleting"
                      :class="{ 'bk-is-loading': isDeleting }"
                      @click="onConfirmDelete(item.uuid)"
                    >
                      {{ $t("templatesManageDialogConfirmDelete", "Delete") }}
                    </button>
                    <button
                      class="bk-button bk-is-small"
                      :disabled="isDeleting"
                      @click="confirmDeleteUuid = ''"
                    >
                      {{ $t("templatesManageDialogCancelDelete", "Cancel") }}
                    </button>
                  </template>
                  <template v-else>
                    <button
                      v-if="
                        adapterHasEditMethod &&
                        item.permissions.includes('edit')
                      "
                      class="bk-button bk-is-small"
                      @click.prevent="onEdit(item.uuid)"
                    >
                      <Icon name="bk_mdi_edit" />
                      {{ $t("templatesManageDialogEdit", "Edit") }}
                    </button>
                    <button
                      v-if="item.permissions.includes('delete')"
                      class="bk-button bk-is-small"
                      @click="confirmDeleteUuid = item.uuid"
                    >
                      <Icon name="bk_mdi_delete" />
                      {{ $t("templatesManageDialogDelete", "Delete") }}
                    </button>
                  </template>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="totalPages > 1">
          <Pagination v-model="page" :total-pages />
        </div>
      </template>
      <p v-else class="bk-lead">
        {{ $t("templatesManageDialogNoResults", "No templates found.") }}
      </p>
    </div>
    <NestedEditorOverlay
      v-if="itemBeingEdited"
      v-bind="itemBeingEdited"
      :element="dialogEl"
      @close="onCloseNested"
      @submit="onSubmitNested"
    />
  </DialogModal>
</template>

<script lang="ts" setup>
import {
  ref,
  useBlokkli,
  computed,
  useAsyncData,
  watch,
  useTemplateRef,
} from "#imports";
import {
  DialogModal,
  Pagination,
  Loading,
  Icon,
  NestedEditorOverlay,
} from "#blokkli/editor/components";
import type {
  AdapterTemplatesGetResult,
  TemplatesSearchArguments,
} from "../types";
import type { NestedEditorOverlayProps } from "#blokkli/editor/components/NestedEditorOverlay/index.vue";

defineEmits<{
  (e: "cancel"): void;
}>();

const { $t, adapter, state } = useBlokkli();

const dialogEl = useTemplateRef("dialogEl");

const page = ref(0);
const confirmDeleteUuid = ref("");
const isDeleting = ref(false);

const itemBeingEdited = ref<NestedEditorOverlayProps | null>(null);

const adapterHasEditMethod = computed<boolean>(
  () => !!adapter.templatesGetEditUrl,
);

const searchParams = computed<TemplatesSearchArguments>(() => ({
  page: page.value,
  filters: {},
}));

const { data, status, refresh } = await useAsyncData<AdapterTemplatesGetResult>(
  () => adapter.templatesSearch!(searchParams.value),
  {
    watch: [searchParams],
    default: () => ({
      items: [],
      filters: [],
      total: 0,
      perPage: 10,
    }),
  },
);

function onCloseNested() {
  itemBeingEdited.value = null;
}

function onSubmitNested() {
  itemBeingEdited.value = null;
  refresh();
}

const perPage = computed(() => data.value.perPage);
const totalPages = computed(() => Math.ceil(data.value.total / perPage.value));
const items = computed(() => data.value.items);

watch(page, () => {
  confirmDeleteUuid.value = "";
});

function onEdit(templateUuid: string) {
  const editUrl = adapter.templatesGetEditUrl!({ templateUuid });
  if (!editUrl) {
    return;
  }
  const template = items.value.find((v) => v.uuid === templateUuid);
  if (!template) {
    return;
  }
  itemBeingEdited.value = {
    url: editUrl,
    uuid: templateUuid,
    title: $t("templatesEditOverlayTitle", "Edit template"),
    label: template.label,
  };
}

async function onConfirmDelete(uuid: string) {
  if (!adapter.templatesDelete) {
    return;
  }

  isDeleting.value = true;

  await state.mutateWithLoadingState(
    () => adapter.templatesDelete!({ templateUuid: uuid }),
    $t("templatesDeleteError", "Failed to delete template."),
    $t("templatesDeleteSuccess", "Template deleted successfully."),
  );

  isDeleting.value = false;
  confirmDeleteUuid.value = "";
  await refresh();
}
</script>
