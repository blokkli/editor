<template>
  <!-- Sidebar -->
  <FeatureHistory />
  <FeatureLibrary v-if="availableFeatures.library" />
  <FeatureComments v-if="availableFeatures.comment" />
  <FeatureClipboard />
  <FeatureStructure />
  <FeatureValidations />

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
  <FeatureMultiSelect v-if="canEdit && !isTranslation" />
  <FeatureDraggingOverlay />
  <FeatureAvailableParagraphs v-if="canEdit && !isTranslation" />
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

const { availableFeatures, canEdit, editMode, runtimeConfig } =
  useParagraphsBuilderStore()

const isTranslation = computed(() => editMode.value === 'translating')
</script>
