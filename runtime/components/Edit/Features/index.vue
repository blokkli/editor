<template>
  <!-- Sidebar -->
  <FeatureHistory />
  <FeatureLibrary v-if="availableFeatures.library" />
  <FeatureComments v-if="availableFeatures.comment" />
  <FeatureClipboard />
  <FeatureStructure />
  <FeatureValidations />
  <FeatureDebug />

  <!-- View Options -->
  <FeatureGrid v-if="runtimeConfig.gridMarkup" />
  <FeatureMask />
  <FeatureArtboard />
  <FeatureFieldAreas />

  <!-- General -->
  <FeaturePreview />
  <FeatureEntityTitle />
  <FeatureTranslations />
  <FeatureOwnership />
  <FeatureMultiSelect v-if="state.canEdit.value && !isTranslation" />
  <FeatureDraggingOverlay />
  <FeatureAvailableParagraphs v-if="state.canEdit.value && !isTranslation" />
  <FeatureSearch />

  <!-- Form -->
  <FeatureDrupalFrame />

  <!-- Menu -->
  <FeaturePublish />
  <FeatureRevert />
  <FeatureImportExisting />
  <FeatureSettings />
  <FeatureExit />

  <!-- Paragraph Actions -->
  <FeatureEditParagraph />
  <FeatureDuplicateParagraph />
  <FeatureDeleteParagraph />
  <FeatureParagraphOptions />
  <FeatureConversions />

  <!-- User provided feature components. -->
  <Component v-for="component in featureComponents" :is="component" />
</template>

<script lang="ts" setup>
import FeatureLibrary from './Library/index.vue'
import FeatureClipboard from './Clipboard/index.vue'
import FeatureStructure from './Structure/index.vue'
import FeatureHistory from './History/index.vue'
import FeatureValidations from './Validations/index.vue'
import FeatureComments from './Comments/index.vue'
import FeatureGrid from './Grid/index.vue'
import FeatureMask from './Mask/index.vue'
import FeatureArtboard from './Artboard/index.vue'
import FeaturePreview from './Preview/index.vue'
import FeatureEntityTitle from './EntityTitle/index.vue'
import FeatureDrupalFrame from './DrupalFrame/index.vue'
import FeatureTranslations from './Translations/index.vue'
import FeatureRevert from './Revert/index.vue'
import FeatureImportExisting from './ImportExisting/index.vue'
import FeatureExit from './Exit/index.vue'
import FeaturePublish from './Publish/index.vue'
import FeatureFieldAreas from './FieldAreas/index.vue'
import FeatureParagraphOptions from './ParagraphOptions/index.vue'
import FeatureDuplicateParagraph from './DuplicateParagraph/index.vue'
import FeatureEditParagraph from './EditParagraph/index.vue'
import FeatureDeleteParagraph from './DeleteParagraph/index.vue'
import FeatureOwnership from './Ownership/index.vue'
import FeatureMultiSelect from './MultiSelect/index.vue'
import FeatureDraggingOverlay from './DraggingOverlay/index.vue'
import FeatureAvailableParagraphs from './AvailableParagraphs/index.vue'
import FeatureConversions from './Conversions/index.vue'
import FeatureSettings from './Settings/index.vue'
import FeatureSearch from './Search/index.vue'
import FeatureDebug from './Debug/index.vue'
import { BlokkliAvailableFeatures } from '../../../types'
import { featureComponents } from '#blokkli-runtime/features'

const { state, runtimeConfig, adapter } = useBlokkli()

const availableFeatures = ref<BlokkliAvailableFeatures>({
  comment: false,
  conversion: false,
  duplicate: false,
  library: false,
})

async function loadAvailableFeatures() {
  const data = await adapter.getAvailableFeatures()
  availableFeatures.value.comment = !!data?.comment
  availableFeatures.value.conversion = !!data?.conversion
  availableFeatures.value.duplicate = !!data?.duplicate
  availableFeatures.value.library = !!data?.library
  if (runtimeConfig.disableLibrary) {
    availableFeatures.value.library = false
  }
}

await loadAvailableFeatures()

const isTranslation = computed(() => state.editMode.value === 'translating')
</script>
