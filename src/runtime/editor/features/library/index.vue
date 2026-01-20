<template>
  <PluginItemAction
    v-if="isReusable"
    id="library_detach"
    :title="$t('libraryDetach', 'Detach from library')"
    icon="reusable-detach"
    edit-only
    multiple
    :weight="-70"
    @click="onDetach"
  />
  <PluginItemAction
    v-else-if="!isReusable"
    id="library_make_reusable"
    :title="$t('libraryAdd', 'Add to library...')"
    :disabled="!canMakeReusable"
    edit-only
    icon="reusable"
    :weight="-70"
    @click="showReusableDialog = true"
  />

  <Teleport :to="ui.mainLayoutElement.value">
    <BlokkliTransition name="slide-up">
      <ReusableDialog
        v-if="showReusableDialog && selection.item.value"
        :uuid="selection.item.value.uuid"
        :background-class="definition?.editor?.previewBackgroundClass"
        @confirm="onMakeReusable"
        @cancel="showReusableDialog = false"
      />
    </BlokkliTransition>
  </Teleport>

  <Teleport :to="ui.mainLayoutElement.value">
    <BlokkliTransition name="slide-in">
      <LibraryDialog
        v-if="placedAction && adapter.getLibraryItems"
        :field="placedAction.field"
        @close="placedAction = null"
        @submit="onAddLibraryItem"
      />
    </BlokkliTransition>
  </Teleport>
  <NestedEditorOverlay
    v-if="editingLibraryItem"
    v-bind="editingLibraryItem"
    :title="$t('libraryItemEditOverlayTitle', 'Edit reusable block')"
    @submit="onSubmitLibraryItem"
    @close="cancelLibraryItemEdit"
  />
</template>

<script lang="ts" setup>
import { ref, computed, useBlokkli, defineBlokkliFeature } from "#imports";
import { PluginItemAction } from "#blokkli/editor/plugins";
import ReusableDialog from "./ReusableDialog/index.vue";
import LibraryDialog from "./LibraryDialog/index.vue";
import {
  BlokkliTransition,
  NestedEditorOverlay,
} from "#blokkli/editor/components";
import {
  defineAddAction,
  onBlokkliEvent,
  useDialog,
} from "#blokkli/editor/composables";
import type { LibraryEditItemEvent } from "./types";
import type { ActionPlacedData } from "#blokkli/editor/types/actions";
import { fromLibraryBlockBundle } from "#blokkli-build/config";

const { adapter } = defineBlokkliFeature({
  id: "library",
  icon: "reusable",
  label: "Library",
  description:
    "Implements support for a block library to manage reusable blocks.",
  requiredAdapterMethods: ["makeBlockReusable", "detachReusableBlock"],
  dependencies: ["add-list"],
});

const { selection, state, types, $t, eventBus, definitions, ui } = useBlokkli();
const showReusableDialog = useDialog("library-reusable", "center");

async function selectNewlyAdded(cb: () => Promise<boolean>): Promise<void> {
  // Get all current UUIDs.
  const uuidsBefore = state.getAllUuids();

  await cb();

  // Find the UUID that was newly added.
  const uuidsAfter = state.getAllUuids();
  const newUuid = uuidsAfter.find((uuid) => !uuidsBefore.includes(uuid));
  if (!newUuid) {
    return;
  }

  // Select the newly added UUID.
  eventBus.emit("select", newUuid);
}

const onDetach = async () => {
  if (!adapter.detachReusableBlock || !selection.uuids.value.length) {
    return;
  }

  await selectNewlyAdded(() =>
    state.mutateWithLoadingState(() =>
      adapter.detachReusableBlock({
        uuids: selection.uuids.value,
      }),
    ),
  );
};

const placedAction = ref<ActionPlacedData | null>(null);
const onAddLibraryItem = async (uuid: string) => {
  if (!placedAction.value || !adapter.addLibraryItem) {
    return;
  }

  await state.mutateWithLoadingState(() =>
    adapter.addLibraryItem!({
      libraryItemUuid: uuid,
      host: placedAction.value!.host,
      afterUuid: placedAction.value!.preceedingUuid,
    }),
  );
  placedAction.value = null;
};

const definition = computed(() => {
  const item = selection.item.value;
  if (!item) {
    return null;
  }
  return definitions.getBlockDefinition(
    item.bundle,
    item.fieldListType,
    item.parentBlockBundle,
  );
});

const itemBundle = computed(() => {
  const item = selection.item.value;
  if (!item) {
    return null;
  }
  return types.getBlockBundleDefinition(item.bundle);
});

const isReusable = computed(() =>
  selection.bundles.value.every((bundle) => bundle === fromLibraryBlockBundle),
);

async function onMakeReusable(label: string) {
  showReusableDialog.value = false;
  const item = selection.item.value;
  if (!item) {
    return;
  }
  await selectNewlyAdded(() =>
    state.mutateWithLoadingState(
      () =>
        adapter.makeBlockReusable({
          label,
          uuid: item.uuid,
        }),
      $t("libraryError", "Failed to add block to library."),
    ),
  );
}

const isSupportedOnEntity = computed(() =>
  types.generallyAvailableBundles.find((v) => v.id === fromLibraryBlockBundle),
);

const fromLibraryAllowedInList = computed(() => {
  if (!selection.uuids.value.length) {
    return !!types.generallyAvailableBundles.find(
      (v) => v.id === fromLibraryBlockBundle,
    );
  }
  return types.allowedTypesInList.value.includes(fromLibraryBlockBundle);
});

const canMakeReusable = computed(
  () =>
    !isReusable.value &&
    itemBundle?.value?.allowReusable &&
    fromLibraryAllowedInList.value,
);

const editingLibraryItem = ref<LibraryEditItemEvent | null>(null);

onBlokkliEvent("library:edit-item", function (e) {
  editingLibraryItem.value = e;
});

function cancelLibraryItemEdit() {
  editingLibraryItem.value = null;
}

function onSubmitLibraryItem() {
  eventBus.emit("reloadState");
  cancelLibraryItemEdit();
}

defineAddAction(() => {
  if (
    !adapter.addLibraryItem ||
    !adapter.getLibraryItems ||
    !isSupportedOnEntity.value
  ) {
    return;
  }
  return {
    id: "library",
    title: $t("libraryAddFromLibrary", "Add from library"),
    description: $t(
      "libraryAddDescription",
      "Add a reusable block from the block library.",
    ),
    icon: "reusable",
    color: "lime",
    weight: 30,
    itemBundle: fromLibraryBlockBundle,
    callback: (data) => {
      placedAction.value = data;
    },
  };
});
</script>

<script lang="ts">
export default {
  name: "Library",
};
</script>
