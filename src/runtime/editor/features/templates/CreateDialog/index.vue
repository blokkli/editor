<template>
  <DialogModal
    id="templates-create"
    :title="$t('templatesCreateDialogTitle', 'Create template')"
    :lead="
      $t(
        'templatesCreateDialogLead',
        'Create a reusable template from the selected blocks. Templates can be added to any page.',
      )
    "
    :width="1200"
    icon="bk_mdi_dashboard"
    :submit-label="$t('templatesCreateDialogSubmit', 'Create template')"
    :can-submit="!!label.length"
    @submit="onSubmit"
    @cancel="$emit('cancel')"
  >
    <div>
      <FormItem>
        <FormText
          id="template_label"
          v-model="label"
          :label="$t('templatesCreateDialogLabelLabel', 'Name')"
          type="text"
          :placeholder="
            $t('templatesCreateDialogLabelPlaceholder', 'e.g. Hero Section')
          "
          required
        />
      </FormItem>
      <FormItem>
        <FormTextarea
          id="template_description"
          v-model="description"
          :label="$t('templatesCreateDialogDescriptionLabel', 'Description')"
          :placeholder="
            $t(
              'templatesCreateDialogDescriptionPlaceholder',
              'Optional description of the template',
            )
          "
        />
      </FormItem>
      <FormItem v-if="canBeDefault">
        <FormToggle
          v-model="isDefault"
          :label="$t('templatesCreateDialogDefaultLabel', 'Use as default')"
          :description="
            $t(
              'templatesCreateDialogDefaultDescription',
              'If set, this template is used automatically when adding a new block of this type.',
            )
          "
        />
      </FormItem>
      <FormItem>
        <div class="bk-form-label">
          {{ $t("templatesCreateDialogPreviewLabel", "Preview") }}
        </div>
        <BlockPreviewRenderer :uuids="uuids" />
      </FormItem>
    </div>
  </DialogModal>
</template>

<script lang="ts" setup>
import { ref, computed, useBlokkli, watch } from "#imports";
import {
  DialogModal,
  FormText,
  FormTextarea,
  FormItem,
  FormToggle,
  BlockPreviewRenderer,
} from "#blokkli/editor/components";

const emit = defineEmits<{
  (e: "confirm", label: string, description: string, isDefault: boolean): void;
  (e: "cancel"): void;
}>();

const { $t, ui } = useBlokkli();

const props = defineProps<{
  uuids: string[];
}>();

const label = ref("");
const description = ref("");
const isDefault = ref(false);

const canBeDefault = computed(() => props.uuids.length === 1);

watch(
  label,
  () => {
    ui.requireDialogCloseConfirm();
  },
  {
    once: true,
  },
);

function onSubmit() {
  emit("confirm", label.value, description.value, isDefault.value);
}
</script>
