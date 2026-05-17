<template>
  <DialogModal
    id="templates-create"
    :title="$t('createTemplate', 'Create template')"
    :lead="
      $t(
        'templatesCreateDialogLead',
        'Create a reusable template from the selected blocks. Templates can be added to any page.',
      )
    "
    :width="1200"
    icon="bk_mdi_dashboard"
    :submit-label="$t('createTemplate', 'Create template')"
    :can-submit="!!label.length"
    mono
    @submit="onSubmit"
    @cancel="$emit('cancel')"
  >
    <PanelSection :title="$t('settings', 'Settings')" padded>
      <FormItem>
        <FormText
          id="template_label"
          v-model="label"
          lazy
          :label="$t('name', 'Name')"
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
          :label="$t('description', 'Description')"
          :placeholder="
            $t(
              'templatesCreateDialogDescriptionPlaceholder',
              'Optional description of the template',
            )
          "
        />
      </FormItem>
      <FormItem>
        <FormToggle
          v-model="isDefault"
          :label="$t('templatesCreateDialogDefaultLabel', 'Use as default')"
          :disabled="!!disabledReason"
          :disabled-reason
          :description="
            $t(
              'templatesCreateDialogDefaultDescription',
              'If set, this template is used automatically when adding a new block of this type.',
            )
          "
        />
      </FormItem>
    </PanelSection>
    <PanelSection :title="$t('preview', 'Preview')">
      <BlockPreviewRenderer :uuids="uuids" />
    </PanelSection>
  </DialogModal>
</template>

<script lang="ts" setup>
import { ref, computed, useBlokkli, watch } from '#imports'
import {
  DialogModal,
  FormText,
  FormTextarea,
  FormItem,
  FormToggle,
  BlockPreviewRenderer,
} from '#blokkli/editor/components'
import PanelSection from '#blokkli/editor/components/Panel/Section/index.vue'

const emit = defineEmits<{
  (e: 'confirm', label: string, description: string, isDefault: boolean): void
  (e: 'cancel'): void
}>()

const { $t, ui, permissions } = useBlokkli()

const props = defineProps<{
  uuids: string[]
}>()

const label = ref('')
const description = ref('')
const isDefault = ref(false)

const canBeDefault = computed(() => props.uuids.length === 1)

const userCanMakeDefault = computed(() =>
  permissions.hasPermission('manage_default_templates'),
)

const disabledReason = computed(() => {
  if (!canBeDefault.value) {
    return $t(
      'templatesCanNotBeDefault',
      'Only single blocks can be made default.',
    )
  } else if (!userCanMakeDefault.value) {
    return $t(
      'templatesMissingDefaultPermissions',
      'Missing permission to create default templates.',
    )
  }

  return null
})

watch(
  label,
  () => {
    ui.requireDialogCloseConfirm()
  },
  {
    once: true,
  },
)

function onSubmit() {
  emit('confirm', label.value, description.value, isDefault.value)
}
</script>
