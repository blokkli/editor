<template>
  <PanelSection
    v-if="choices.length"
    :title="$t('clipboardUploadBundles', 'Block types')"
    padded
  >
    <div class="flex flex-col gap-15">
      <FormRadioTabs
        v-for="choice in choices"
        :id="'clipboard-upload-bundle-' + choice.type"
        :key="choice.type"
        :model-value="bundles[choice.type]"
        :label="choice.label"
        :options="choice.options"
        @update:model-value="bundles = { ...bundles, [choice.type]: $event }"
      />
    </div>
  </PanelSection>
</template>

<script lang="ts" setup>
import { computed, useBlokkli } from '#imports'
import { FormRadioTabs } from '#blokkli/editor/components'
import PanelSection from '#blokkli/editor/components/Panel/Section/index.vue'
import type { UploadType } from '#blokkli/editor/types/uploads'
import type { ClipboardFileGroup } from '../types'

const props = defineProps<{
  /**
   * The bundles each type of file can be added with.
   */
  groups: ClipboardFileGroup[]
  /**
   * The upload types of the files to add.
   */
  types: UploadType[]
}>()

/**
 * The bundle of each type's blocks.
 */
const bundles = defineModel<Partial<Record<UploadType, string>>>({
  required: true,
})

const { $t, types: blockTypes } = useBlokkli()

/**
 * The types whose bundle can be picked.
 */
const choices = computed(() =>
  props.groups
    .filter(
      (group) => group.bundles.length > 1 && props.types.includes(group.type),
    )
    .map((group) => ({
      type: group.type,
      label:
        group.type === 'image'
          ? $t('clipboardUploadImages', 'Images')
          : $t('clipboardUploadFiles', 'Files'),
      options: group.bundles.map((bundle) => ({
        value: bundle,
        label: blockTypes.getBlockBundleDefinition(bundle)?.label || bundle,
      })),
    })),
)
</script>
