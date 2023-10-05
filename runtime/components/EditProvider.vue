<template>
  <Teleport to="body">
    <div v-if="isInitializing" class="pb pb-init-overlay">
      <IconSpinner />
    </div>
    <div v-if="!currentUserIsOwner" class="pb-owner-indicator">
      <p>
        Diese Seite wird aktuell von
        <strong>{{ ownerName }}</strong> bearbeitet. Änderungen können nur von
        einer Person gleichzeitig durchgeführt werden.
      </p>
      <button class="pb-button is-danger" @click="takeOwnership">
        Mir zuweisen
      </button>
    </div>
    <div class="pb-sidebar" v-if="data" v-show="visibleSidebar">
      <PaneHistory
        v-if="visibleSidebar === 'history'"
        :mutations="mutations"
        :current-index="currentMutationIndex"
        :editing-enabled="canEdit"
        @set-history-index="setHistoryIndex"
      />
      <PaneLibrary
        v-else-if="availableFeatures.library && visibleSidebar === 'library'"
        :mutations="mutations"
        :current-index="currentMutationIndex"
        @set-history-index="setHistoryIndex"
      />
      <PaneComments
        v-else-if="visibleSidebar === 'comments'"
        :comments="comments"
      />
      <PaneStructure
        v-else-if="visibleSidebar === 'structure'"
        :all-types="data.allTypes"
      />
      <PaneErrors
        v-else-if="visibleSidebar === 'errors'"
        :violations="violations"
      />
      <PaneClipboard
        v-show="visibleSidebar === 'clipboard'"
        :all-types="data.allTypes"
        @paste="visibleSidebar = 'clipboard'"
      />
    </div>
    <transition name="pb-slide-in" :duration="200">
      <DrupalFrame
        v-if="modalUrl && data?.allTypes"
        :url="modalUrl"
        :all-types="data.allTypes"
        :bundle="iframeBundle"
        :translation-label="translationLabel"
        @close="modalClose"
        @submit="modalSubmit"
        @submit-entity-form="modalSubmitEntityForm"
      />
    </transition>
    <AvailableParagraphs
      @wheel.stop=""
      v-if="data && selectableParagraphTypes.length"
      :can-use="canEdit && !isTranslation"
      :paragraph-types="generallyAvailableParagraphTypes"
      :selectable="selectableParagraphTypes"
    />

    <Preview v-if="showPreview" />

    <div v-if="!isInitializing" class="pb pb-top pb-control">
      <Toolbar
        @revert="showRevertDialog = true"
        @undo="undo"
        @redo="redo"
        @publish="publish"
        @close="close"
        @toggle-sidebar="toggleSidebar($event)"
        @toggle-preview="showPreview = !showPreview"
        @open-entity-form="openEntityForm"
        @toggle-mask="toggleMaskVisible"
        @show-templates="showTemplates = true"
        @show-translations="openTranslations"
        :editing-enabled="canEdit"
        :comments-enabled="availableFeatures.comment"
        :library-enabled="availableFeatures.library"
        :is-pressing-control="isPressingControl"
        :is-pressing-space="isPressingSpace"
        :current-index="currentMutationIndex"
        :mutations="mutations"
        :active-sidebar="visibleSidebar"
        :show-preview="showPreview"
        :selected-paragraph-uuid="selectedParagraph?.uuid"
        :violation-count="violations.length"
        :modal-url="modalUrl"
        :mask-visible="maskVisible"
        :edit-mode="editMode"
      >
        <template #title>
          <div class="pb-toolbar-title">
            <div>
              <span
                class="pb-status-indicator"
                :class="{
                  'pb-is-success': entity.status && !mutations.length,
                  'pb-is-warning': entity.status && mutations.length,
                }"
              ></span>
              <strong>{{ entity.label }}</strong>
              <span>&nbsp;{{ entity.bundleLabel }}</span>
            </div>
          </div>
          <div class="pb-tooltip">
            <span v-if="entity.status && !mutations.length"
              >Seite ist publiziert</span
            >
            <span v-else-if="entity.status && mutations.length"
              >Seite ist publiziert (Änderungen ausstehend)</span
            >
            <span v-else>Seite ist nicht publiziert</span>
          </div>
        </template>
        <template #afterTitle>
          <ToolbarTranslationState
            v-bind="translationState"
            :entity-translations="entity.translations"
            v-model="currentLanguage"
            @translate-entity="onTranslateEntity($event)"
          />
        </template>
        <template #right>
          <ToolbarCanvas
            :is-pressing-space="isPressingSpace"
            :is-pressing-control="isPressingControl"
            :preview-open="showPreview"
            :sidebar-open="!!(visibleSidebar || modalUrl)"
          />
        </template>
      </Toolbar>
    </div>
    <Actions
      v-if="selectedParagraph && data"
      :selected="selectedParagraph"
      :paragraph-type="selectedParagraphType"
      :is-dragging="isDragging"
      :conversions="data.conversions"
      :all-types="data.allTypes"
      :allowed-types="selectableParagraphTypes"
      :can-comment="availableFeatures.comment"
      :library-enabled="availableFeatures.library"
      :edit-mode="editMode"
      @delete="deleteParagraph(selectedParagraph.uuid)"
      @duplicate="duplicateParagraph(selectedParagraph.uuid)"
      @edit="editParagraph(selectedParagraph.uuid)"
      @translate="editParagraph(selectedParagraph.uuid)"
      @convert="convertParagraph(selectedParagraph.uuid, $event)"
      @make-reusable="makeParagraphReusable(selectedParagraph.uuid, $event)"
      @add-comment="onAddComment(selectedParagraph.uuid, $event)"
    >
      <ParagraphOptions
        :key="'options_' + selectedParagraph.uuid"
        :uuid="selectedParagraph.uuid"
        :paragraph-type="selectedParagraph.paragraphType"
        :reusable-bundle="selectedParagraph.reusableBundle"
        :reusable-uuid="selectedParagraph.reusableUuid"
        :mutated-paragraph-options="mutatedParagraphOptions"
        @update-option="onUpdateParagraphOption"
        @persist-options="onPersistOptions"
        :editing-enabled="editMode === 'editing'"
      />
    </Actions>
    <MultiSelect
      v-if="!isPressingSpace && canEdit && !isTranslation"
      :is-pressing-control="isPressingControl"
      @start-select="onMultiSelectStart"
      @select-single="onSelectParagraph"
      @select-multiple="onSelectMultiple"
    />
    <Selection
      v-if="selectedParagraphs.length && canEdit"
      :items="selectedParagraphs"
      :is-pressing-control="isPressingControl"
      @delete="deleteSelectedParagraphs"
    />
    <CommentsOverlay
      v-if="availableFeatures.comment"
      :comments="comments"
      @add-comment="onAddComment($event.uuid, $event.body)"
      @resolve-comment="onResolveComment($event)"
    />
    <FieldAreaOverlay
      :mask-visible="maskVisible"
      :active-field-key="activeFieldKey"
      @select="activeFieldKey = $event"
    />

    <Messages />

    <transition appear name="pb-slide-up" :duration="900">
      <TemplatesDialog
        :entity-type="entityType"
        :bundle="bundle"
        :current-entity-uuid="entityUuid"
        :fields="mutatedFields"
        v-if="showTemplates && possibleFieldNames.length"
        @confirm="copyFromExisting($event.sourceUuid, $event.fields)"
        @cancel="showTemplates = false"
      />
    </transition>
    <transition appear name="pb-slide-up" :duration="900">
      <PbDialog
        v-if="showRevertDialog"
        title="Änderungen unwiderruflich verwerfen"
        lead="Damit werden alle Änderungen gelöscht und der aktuell publizierte Stand wiederhergestellt. Diese Aktion kann nicht rückgängig gemacht werden."
        submit-label="Änderungen verwerfen"
        is-danger
        @submit="revertAllChanges"
        @cancel="showRevertDialog = false"
      />
    </transition>
  </Teleport>
  <slot></slot>
</template>

<script lang="ts" setup>
import Toolbar from './Edit/Toolbar/index.vue'
import DrupalFrame from './Edit/DrupalFrame/index.vue'
import AvailableParagraphs from './Edit/AvailableParagraphs/index.vue'
import IconSpinner from './Edit/Icons/Spinner.vue'
import Actions from './Edit/ParagraphActions.vue'
import MultiSelect from './Edit/MultiSelect/index.vue'
import CommentsOverlay from './Edit/CommentsOverlay/index.vue'
import PaneClipboard from './Edit/Sidebar/Panes/Clipboard/index.vue'
import PaneHistory from './Edit/Sidebar/Panes/History/index.vue'
import PaneLibrary from './Edit/Sidebar/Panes/Library/index.vue'
import PaneStructure from './Edit/Sidebar/Panes/Structure/index.vue'
import PaneComments from './Edit/Sidebar/Panes/Comments/index.vue'
import PaneErrors from './Edit/Sidebar/Panes/Errors/index.vue'
import Selection from './Edit/MultiSelect/Selection/index.vue'
import Preview from './Edit/Preview/index.vue'
import ToolbarCanvas from './Edit/Toolbar/Canvas/index.vue'
import ToolbarTranslationState from './Edit/Toolbar/TranslationState/index.vue'
import TemplatesDialog from './Edit/Templates/index.vue'
import FieldAreaOverlay from './Edit/FieldAreaOverlay/index.vue'
import Messages from './Edit/Messages/index.vue'
import PbDialog from './Edit/Dialog/index.vue'
import ParagraphOptions, {
  UpdateParagraphOptionEvent,
} from './Edit/ParagraphOptions/index.vue'
import { eventBus, emitMessage } from './Edit/eventBus'
import {
  MoveParagraphEvent,
  AddNewParagraphEvent,
  AddClipboardParagraphEvent,
  DraggableExistingParagraphItem,
  EditParagraphEvent,
  MoveMultipleParagraphsEvent,
  AddReusableParagraphEvent,
  MutatedParagraphOptions,
} from './Edit/types'
import { definitions } from '#nuxt-paragraphs-builder/definitions'
import '#nuxt-paragraphs-builder/styles'
import {
  PbMutatedField,
  PbAllowedBundle,
  PbComment,
  PbEditState,
  PbMutation,
  PbViolation,
  PbType,
  PbEditEntity,
  PbAvailableLanguage,
  PbEditMode,
} from '../types'
import adapter from './../adapter/drupal'
import { buildDraggableItem, falsy } from './Edit/helpers'
import { ParagraphsBuilderEditStateFragment } from '#build/graphql-operations'

const route = useRoute()
const router = useRouter()
const runtimeConfig = useRuntimeConfig().public.paragraphsBuilder

const currentLanguage = computed({
  get() {
    const v = route.query.language
    if (v && typeof v === 'string') {
      return v
    }
    return translationState.value.sourceLanguage
  },
  set(language) {
    const path = entity.value.translations.find((v) => v.langcode === language)
      ?.url
    if (path) {
      router.replace({
        path,
        query: {
          ...route.query,
          language,
        },
      })
    }
    loadState(language)
  },
})

const availableFeatures = ref({
  comment: false,
  conversion: false,
  duplicate: false,
  library: false,
})
const currentUserIsOwner = ref(false)
const ownerName = ref('')
const mutatedFields = ref<PbMutatedField[]>([])
const entity = ref<PbEditEntity>({
  id: undefined,
  changed: undefined,
  status: false,
  translations: [],
})
const mutatedParagraphOptions = ref<MutatedParagraphOptions>({})
const translationState = ref({
  isTranslatable: false,
  sourceLanguage: '',
  availableLanguages: [] as PbAvailableLanguage[],
  translations: [] as string[],
})
const selectedParagraph = ref<DraggableExistingParagraphItem | null>(null)
const selectedParagraphs = ref<DraggableExistingParagraphItem[]>([])
const activeFieldKey = ref('')
const violations = ref<PbViolation[]>([])
const isEditingParagraph = ref(false)
const isDragging = ref(false)
const refreshTrigger = ref(0)
const modalUrl = ref('')
const iframeBundle = ref('')
const currentMutationIndex = ref(-1)
const mutations = ref<PbMutation[]>([])
const visibleSidebar = ref('')
const isLoading = ref(false)
const isInitializing = ref(true)
const isPressingControl = ref(false)
const isPressingSpace = ref(false)
const showPreview = ref(false)
const showTemplates = ref(false)
const showRevertDialog = ref(false)
const maskVisible = ref(window.localStorage.getItem('_pb_mask_visible') === '1')

const activeField = computed(() => {
  if (activeFieldKey.value) {
    const el = document.querySelector(
      `[data-field-key="${activeFieldKey.value}"]`,
    )
    if (el && el instanceof HTMLElement) {
      const label = el.dataset.fieldLabel
      const name = el.dataset.fieldName
      const isNested = el.dataset.fieldIsNested === 'true'
      const hostEntityType = el.dataset.hostEntityType
      const hostEntityUuid = el.dataset.hostEntityUuid
      if (label && name && hostEntityType && hostEntityUuid) {
        return { label, name, hostEntityType, hostEntityUuid, isNested }
      }
    }
  }
})

function toggleMaskVisible() {
  maskVisible.value = !maskVisible.value
  window.localStorage.setItem('_pb_mask_visible', maskVisible.value ? '1' : '0')
}

function openTranslations() {
  modalUrl.value = `/${currentLanguage.value}/paragraphs_builder/${props.entityType}/${props.entityUuid}/translate-paragraphs?destination=/de/paragraphs_builder/redirect`
}

function modulo(n: number, m: number) {
  return ((n % m) + m) % m
}

const canEdit = computed(() => {
  return currentUserIsOwner.value
})

const isTranslation = computed(() => {
  return currentLanguage.value !== translationState.value.sourceLanguage
})

const translationLabel = computed(() => {
  if (!isTranslation.value) {
    return
  }

  return translationState.value.availableLanguages.find(
    (v) => v.id === currentLanguage.value,
  )?.name
})

const editMode = computed<PbEditMode>(() => {
  if (!canEdit.value) {
    return 'readonly'
  }
  if (isTranslation.value) {
    return 'translating'
  }

  return 'editing'
})

const hasNoParagraphs = computed(() => {
  return !mutatedFields.value.find((v) => v.field.list?.length)
})

function onSelectMultiple(items: DraggableExistingParagraphItem[]) {
  selectedParagraphs.value = items
}

const hasSidebar = computed<boolean>(() => {
  return !!visibleSidebar.value || !!modalUrl.value
})

watch(hasSidebar, (has) =>
  has
    ? document.body.classList.add('pb-has-sidebar')
    : document.body.classList.remove('pb-has-sidebar'),
)

watch(isPressingSpace, (has) =>
  has
    ? document.body.classList.add('pb-is-pressing-space')
    : document.body.classList.remove('pb-is-pressing-space'),
)

useHead({
  bodyAttrs: {
    class: [isLoading.value ? 'pb-is-loading' : ''],
  },
})

const props = defineProps<{
  entityType: string
  entityUuid: string
  bundle: string
}>()

const selectedParagraphType = computed<PbType | undefined>(
  () =>
    data.value?.allTypes.find(
      (v) => v.id === selectedParagraph.value?.paragraphType,
    ),
)

function openEntityForm() {
  selectedParagraph.value = null
  selectedParagraphs.value = []
  iframeBundle.value = ''
  if (entity.value.editUrl) {
    modalUrl.value =
      entity.value.editUrl +
      '?paragraphsBuilder=true&destination=/de/paragraphs_builder/redirect'
  } else {
    modalUrl.value = `/${currentLanguage.value}/${props.entityType}/${entity.value.id}/edit?paragraphsBuilder=true&destination=/de/paragraphs_builder/redirect`
  }
}

function onMultiSelectStart() {
  selectedParagraph.value = null
  selectedParagraphs.value = []
}

const contextVariables = computed(() => {
  return {
    entityType: props.entityType.toUpperCase() as any,
    entityUuid: props.entityUuid,
    langcode: currentLanguage.value,
  }
})

function toggleSidebar(key: string) {
  removeDroppedElements()
  modalUrl.value = ''
  iframeBundle.value = ''
  if (visibleSidebar.value === key) {
    visibleSidebar.value = ''
  } else {
    visibleSidebar.value = key
  }
}

interface MutationResponseLike<T> {
  data: {
    state?: {
      action?: {
        success?: boolean
        state?: T
      }
    }
  }
}

async function onAddComment(uuid: string, body: string) {
  const result = await useGraphqlMutation('paragraphsBuilderAddComment', {
    ...contextVariables.value,
    targetUuid: uuid,
    body,
  })
  if (result.data.state?.action) {
    comments.value = result.data.state.action
  }
}

async function onResolveComment(id: string | number) {
  const result = await useGraphqlMutation('paragraphsBuilderResolveComment', {
    ...contextVariables.value,
    id: String(id),
  })
  if (result.data.state?.action) {
    comments.value = result.data.state.action
  }
}

function lockBody() {
  document.body.classList.add('pb-body-loading')
  isLoading.value = true
}

function unlockBody() {
  document.body.classList.remove('pb-body-loading')
  isLoading.value = false
}

async function mutateWithLoadingState(
  promise: Promise<MutationResponseLike<ParagraphsBuilderEditStateFragment>>,
  errorMessage?: string,
  successMessage?: string,
): Promise<boolean> {
  lockBody()
  try {
    const result = await promise
    unlockBody()
    if (result.data.state?.action?.state) {
      setContext(adapter.mapState(result.data.state?.action?.state))
    } else {
      throw new Error('Unexpected error.')
    }
    if (successMessage) {
      emitMessage(successMessage)
    }
    return true
  } catch (_e) {
    emitMessage(
      errorMessage || 'Es ist ein unerwarteter Fehler aufgetreten.',
      'error',
    )
  }

  unlockBody()
  return false
}

async function addNewParagraph(e: AddNewParagraphEvent) {
  if (!canEdit.value) {
    return
  }
  const definition = definitions.find((v) => v.bundle === e.item.paragraphType)
  if (definition?.disableEdit) {
    await mutateWithLoadingState(
      useGraphqlMutation('addParagraph', {
        ...contextVariables.value,
        hostType: e.host.type,
        hostFieldName: e.host.fieldName,
        hostUuid: e.host.uuid,
        afterUuid: e.afterUuid,
        type: e.type,
      }),
    )
    return
  }

  iframeBundle.value = e.type
  modalUrl.value =
    '/' +
    [
      currentLanguage.value,
      'paragraphs_builder',
      props.entityType,
      props.entityUuid,
      'add',
      e.type,
      e.host.type,
      e.host.uuid,
      e.host.fieldName,
      e.afterUuid,
    ]
      .filter(Boolean)
      .join('/')
}

function onTranslateEntity(langcode: string) {
  selectedParagraph.value = null
  selectedParagraphs.value = []
  iframeBundle.value = ''
  modalUrl.value = `/${langcode}/${props.entityType}/${entity.value.id}/translations/add/${translationState.value.sourceLanguage}/${langcode}?paragraphsBuilder=true&destination=/de/paragraphs_builder/redirect`
}

function editParagraph(uuid: string) {
  iframeBundle.value = selectedParagraph.value?.paragraphType || ''
  modalUrl.value = `/${currentLanguage.value}/paragraphs_builder/${props.entityType}/${props.entityUuid}/edit/${uuid}`
}

function onDraggingStart() {
  isDragging.value = true
}

function onDraggingEnd() {
  isDragging.value = false
}

async function onPersistOptions(items: UpdateParagraphOptionEvent[]) {
  if (!items.length) {
    return
  }
  if (items.length === 1) {
    const item = items[0]
    await mutateWithLoadingState(
      useGraphqlMutation('updateParagraphOption', {
        ...contextVariables.value,
        ...item,
      }),
    )
    return
  }
  const persistItems = items.map((v) => {
    return {
      uuid: v.uuid,
      key: v.key,
      value: v.value,
      pluginId: 'paragraph_builder_data',
    }
  })
  await mutateWithLoadingState(
    useGraphqlMutation('bulkUpdateParagraphBehaviorSettings', {
      ...contextVariables.value,
      items: persistItems,
    }),
  )
}

async function onUpdateParagraphOption(data: UpdateParagraphOptionEvent) {
  if (!mutatedParagraphOptions.value[data.uuid]) {
    mutatedParagraphOptions.value[data.uuid] = {}
  }
  if (!mutatedParagraphOptions.value[data.uuid].paragraph_builder_data) {
    mutatedParagraphOptions.value[data.uuid].paragraph_builder_data = {}
  }
  mutatedParagraphOptions.value[data.uuid].paragraph_builder_data[data.key] =
    data.value
}

async function addClipboardParagraph(e: AddClipboardParagraphEvent) {
  if (!canEdit.value) {
    return
  }
  if (e.item.paragraphType === 'text') {
    await mutateWithLoadingState(
      useGraphqlMutation('addTextParagraph', {
        ...contextVariables.value,
        text: e.item.clipboardData,
        hostType: e.host.type,
        hostUuid: e.host.uuid,
        hostFieldName: e.host.fieldName,
        afterUuid: e.afterUuid,
      }),
      'Der Text-Abschnitt konnte nicht hinzugefügt werden.',
    )
  } else if (e.item.paragraphType === 'video_remote') {
    await mutateWithLoadingState(
      useGraphqlMutation('addVideoRemoteParagraph', {
        ...contextVariables.value,
        url: 'http://www.youtube.com/watch?v=' + e.item.clipboardData,
        hostType: e.host.type,
        hostUuid: e.host.uuid,
        hostFieldName: e.host.fieldName,
        afterUuid: e.afterUuid,
      }),
      'Der Video-Abschnitt konnte nicht hinzugefügt werden.',
    )
  }
  if (visibleSidebar.value === 'clipboard') {
    visibleSidebar.value = ''
  }
}

async function moveParagraph(e: MoveParagraphEvent) {
  if (!canEdit.value) {
    return
  }
  await mutateWithLoadingState(
    useGraphqlMutation('moveParagraph', {
      ...contextVariables.value,
      uuid: e.item.uuid,
      hostType: e.host.type,
      hostUuid: e.host.uuid,
      hostFieldName: e.host.fieldName,
      afterUuid: e.afterUuid,
    }),
    'Der Abschnitt konnte nicht verschoben werden.',
  )
}

async function moveMultipleParagraphs(e: MoveMultipleParagraphsEvent) {
  if (!canEdit.value) {
    return
  }
  await mutateWithLoadingState(
    useGraphqlMutation('moveMultipleParagraphs', {
      ...contextVariables.value,
      uuids: e.uuids,
      hostType: e.host.type,
      hostUuid: e.host.uuid,
      hostFieldName: e.host.fieldName,
      afterUuid: e.afterUuid,
    }),
    'Die Abschnitte konnte nicht verschoben werden.',
  )
}

async function addReusableParagraph(e: AddReusableParagraphEvent) {
  if (!canEdit.value) {
    return
  }
  await mutateWithLoadingState(
    useGraphqlMutation('addReusableParagraph', {
      ...contextVariables.value,
      libraryItemId: e.item.libraryItemId,
      hostType: e.host.type,
      hostUuid: e.host.uuid,
      hostFieldName: e.host.fieldName,
      afterUuid: e.afterUuid,
    }),
    'Der wiederverwendbare Abschnitt konnte nicht hinzugefügt werden.',
  )
}

function setContext(context?: PbEditState) {
  removeDroppedElements()
  modalClose()
  const newMutatedFields = context?.mutatedState?.fields || []
  mutatedFields.value = newMutatedFields
  mutatedParagraphOptions.value = context?.mutatedState?.behaviorSettings || {}
  refreshTrigger.value = Date.now()
  mutations.value = context?.mutations || []
  violations.value = context?.mutatedState?.violations || []
  const currentIndex = context?.currentIndex
  currentMutationIndex.value = currentIndex === undefined ? -1 : currentIndex
  currentUserIsOwner.value = !!context?.currentUserIsOwner
  ownerName.value = context?.ownerName || ''
  entity.value.id = context?.entity?.id
  entity.value.changed = context?.entity?.changed
  entity.value.label = context?.entity?.label
  entity.value.status = context?.entity?.status
  entity.value.translations = context?.entity?.translations || []
  entity.value.bundleLabel = context?.entity?.bundleLabel || ''
  entity.value.editUrl = context?.entity.editUrl

  translationState.value.isTranslatable =
    !!context?.translationState?.isTranslatable
  translationState.value.translations =
    context?.translationState?.translations?.filter(falsy) || []
  translationState.value.sourceLanguage =
    context?.translationState?.sourceLanguage || ''
  translationState.value.availableLanguages =
    context?.translationState?.availableLanguages || []

  eventBus.emit('updateMutatedFields', { fields: newMutatedFields })
}

const possibleFieldNames = computed<string[]>(() => {
  return mutatedFields.value.map((v) => v.name)
})

async function loadState(langcode: string) {
  const { data } = await useGraphqlQuery('paragraphsEditState', {
    ...contextVariables.value,
    langcode,
  })

  setContext(adapter.mapState(data.state))
  unlockBody()
}

async function loadAvailableFeatures() {
  const data = await useGraphqlQuery('paragraphsBuilderAvailableFeatures').then(
    (v) => v.data.features,
  )
  const mutations = data?.mutations || []
  availableFeatures.value.comment = !!data?.comment
  availableFeatures.value.conversion = !!data?.conversion
  availableFeatures.value.duplicate = mutations.includes('duplicate')
  availableFeatures.value.library = !!data?.library
  if (runtimeConfig.disableLibrary) {
    availableFeatures.value.library = false
  }
}

function modalClose() {
  removeDroppedElements()
  modalUrl.value = ''
  isEditingParagraph.value = false
  unlockBody()
}

async function modalSubmit() {
  removeDroppedElements()
  modalUrl.value = ''
  visibleSidebar.value = ''
  isEditingParagraph.value = false
  iframeBundle.value = ''
  await loadState(currentLanguage.value)
}

async function modalSubmitEntityForm() {
  modalUrl.value = ''
  visibleSidebar.value = ''
  isEditingParagraph.value = false
  iframeBundle.value = ''
  await refreshNuxtData()
  await loadState(currentLanguage.value)
}

async function unselectParagraph() {
  selectedParagraph.value = null
}

function onSelectParagraph(item: DraggableExistingParagraphItem) {
  selectedParagraph.value = item
  selectedParagraphs.value = []

  // Determine if the selected paragraph has nested paragraphs.
  const hasNested = paragraphTypesWithNested.value.includes(item.paragraphType)
  if (hasNested) {
    // Get the nested paragraph fields.
    const nestedFields =
      data.value?.allowedTypes
        .filter(
          (v) =>
            v.entityType === 'paragraph' && v.bundle === item.paragraphType,
        )
        .map((v) => v.fieldName) || []

    // When we have exactly one nested paragraph field, we can set the active
    // field key to this field. That way the UI will show this field is active
    // and display available paragraphs for this field.
    if (nestedFields.length === 1) {
      activeFieldKey.value = `${item.uuid}:${nestedFields[0]}`
      return
    }
  }
  activeFieldKey.value = `${item.hostUuid}:${item.hostFieldName}`
}

function onSelectParagraphAdditional(item: DraggableExistingParagraphItem) {
  if (selectedParagraphs.value.find((v) => v.uuid === item.uuid)) {
    selectedParagraphs.value = selectedParagraphs.value.filter(
      (v) => v.uuid !== item.uuid,
    )
    if (selectedParagraphs.value.length === 1) {
      selectedParagraph.value = selectedParagraphs.value[0]
      selectedParagraphs.value = []
    }
    return
  }
  if (selectedParagraph.value) {
    selectedParagraphs.value.push(selectedParagraph.value)
  }
  selectedParagraphs.value.push(item)
  unselectParagraph()
}

function onEditParagraph(e: EditParagraphEvent) {
  if (!canEdit.value) {
    return
  }
  const definition = definitions.find((v) => v.bundle === e.bundle)
  if (definition?.disableEdit) {
    return
  }
  if (isTranslation.value) {
    const type = data.value?.allTypes.find((v) => v.id === e.bundle)
    if (!type) {
      return
    }

    if (!type.isTranslatable) {
      return
    }
  }
  editParagraph(e.uuid)
}

async function deleteParagraph(uuid: string | null | undefined) {
  if (!uuid || !canEdit.value || isTranslation.value) {
    return
  }
  await mutateWithLoadingState(
    useGraphqlMutation('deleteParagraph', {
      ...contextVariables.value,
      uuid,
    }),
    'Der Abschnitt konnte nicht entfernt werden.',
  )

  unselectParagraph()
}

async function deleteSelectedParagraphs() {
  const uuids = selectedParagraphs.value.map((v) => v.uuid)
  if (!uuids.length || !canEdit.value) {
    return
  }
  await mutateWithLoadingState(
    useGraphqlMutation('deleteMultipleParagraphs', {
      ...contextVariables.value,
      uuids,
    }),
    'Die Abschnitte konnten nicht entfernt werden.',
  )

  unselectParagraph()
  selectedParagraphs.value = []
}

async function convertParagraph(uuid: string, targetBundle: string) {
  if (!canEdit.value) {
    return
  }
  await mutateWithLoadingState(
    useGraphqlMutation('convertParagraph', {
      ...contextVariables.value,
      uuid,
      targetBundle,
    }),
    'Der Abschnitt konnte nicht konvertiert werden.',
  )

  unselectParagraph()
}

async function duplicateParagraph(uuid: string | null | undefined) {
  if (!uuid || !canEdit.value || isTranslation.value) {
    return
  }
  await mutateWithLoadingState(
    useGraphqlMutation('duplicateParagraph', {
      ...contextVariables.value,
      uuid,
    }),
    'Der Abschnitt konnte nicht dupliziert werden.',
  )
}

async function makeParagraphReusable(
  uuid: string | null | undefined,
  label: string,
) {
  if (!uuid || !canEdit.value) {
    return
  }
  await mutateWithLoadingState(
    useGraphqlMutation('makeParagraphReusable', {
      ...contextVariables.value,
      uuid,
      label,
    }),
    'Der Abschnitt konnte nicht wiederverwendbar gemacht werden.',
  )
  selectedParagraph.value = null
}

function removeDroppedElements() {
  document
    .querySelectorAll('.pb-paragraphs-container .pb-clone')
    .forEach((v) => v.remove())
  document
    .querySelectorAll('.pb-paragraphs-container .pb-moved-item')
    .forEach((v) => v.remove())
  document
    .querySelectorAll('.pb-multi-select-hidden')
    .forEach((v) => v.classList.remove('pb-multi-select-hidden'))
}

const { data } = await useLazyAsyncData(() => {
  return useGraphqlQuery('availableParagraphs').then((v) => {
    const allTypes = v.data.entityQuery.items?.filter(
      (v) => v && 'icon' in v,
    ) as PbType[]
    const allowedTypes = v.data.paragraphsBuilderAllowedTypes || []
    const conversions = v.data.paragraphsBuilderConversions || []
    return { allTypes, allowedTypes, conversions }
  })
})

const allowedTypes = computed<PbAllowedBundle[]>(() => {
  return data.value?.allowedTypes || []
})

/**
 * All paragraph types that themselves have nested paragraphs.
 */
const paragraphTypesWithNested = computed<string[]>(() => {
  return (
    data.value?.allowedTypes
      .filter((v) => v.entityType === 'paragraph')
      .map((v) => v.bundle) || []
  )
})

const generallyAvailableParagraphTypes = computed(() => {
  const fieldNames = mutatedFields.value.map((v) => v.name)
  const typesOnEntity = (
    data.value?.allowedTypes.filter((v) => {
      return (
        v.entityType === props.entityType &&
        v.bundle === props.bundle &&
        fieldNames.includes(v.fieldName)
      )
    }) || []
  )
    .flatMap((v) => v.allowedTypes)
    .filter(Boolean)

  const typesOnParagraphs =
    data.value?.allowedTypes
      .filter((v) => {
        return typesOnEntity.includes(v.bundle)
      })
      .flatMap((v) => v.allowedTypes) || []

  const allAllowedTypes = [...typesOnEntity, ...typesOnParagraphs]

  return (
    data.value?.allTypes.filter(
      (v) => v.id && allAllowedTypes.includes(v.id),
    ) || []
  )
})

const selectableParagraphTypes = computed(() => {
  if (selectedParagraph.value) {
    // If the selected paragraph allows nested paragraphs, return the allowed paragraphs for it.
    if (
      paragraphTypesWithNested.value.includes(
        selectedParagraph.value.paragraphType,
      )
    ) {
      return allowedTypes.value
        .filter(
          (v) =>
            v.entityType === 'paragraph' &&
            v.bundle === selectedParagraph.value?.paragraphType,
        )
        .flatMap((v) => v.allowedTypes)
        .filter(Boolean) as string[]
    }
    // If the selected paragraph is inside a nested paragraph, return the allowed paragraphs of the parent paragraph.
    else if (selectedParagraph.value.hostType === 'paragraph') {
      return allowedTypes.value
        .filter(
          (v) =>
            v.entityType === 'paragraph' &&
            v.bundle === selectedParagraph.value?.hostBundle,
        )
        .flatMap((v) => v.allowedTypes)
        .filter(Boolean) as string[]
    } else {
      return allowedTypes.value
        .filter(
          (v) =>
            v.entityType === props.entityType &&
            v.bundle === props.bundle &&
            v.fieldName === selectedParagraph.value?.hostFieldName,
        )
        .flatMap((v) => v.allowedTypes)
        .filter(Boolean) as string[]
    }
  }
  if (
    activeField.value &&
    activeField.value.hostEntityType === props.entityType
  ) {
    return (
      allowedTypes.value.find((v) => {
        return (
          v.bundle === props.bundle && v.fieldName === activeField.value?.name
        )
      })?.allowedTypes || []
    )
  }

  return generallyAvailableParagraphTypes.value.map((v) => v.id || '')
})

async function revertAllChanges() {
  await mutateWithLoadingState(
    useGraphqlMutation('revertAllChanges', contextVariables.value),
    'Änderungen konnten nicht verworfen werden.',
    'Alle Änderungen wurden verworfen.',
  )
  showRevertDialog.value = false
}

function onWindowMouseDown(e: MouseEvent) {
  if (e.ctrlKey || isPressingSpace.value) {
    return
  }
  if (e.target && e.target instanceof Element) {
    if (e.target.closest('.pb-paragraph-actions')) {
      return
    }
    if (e.target.closest('[data-uuid]')) {
      return
    }
    if (e.target.closest('.pb-list')) {
      return
    }
    if (e.target.closest('.pb-control')) {
      return
    }

    const closestField = e.target.closest('[data-field-key]')
    if (closestField && closestField instanceof HTMLElement) {
      activeFieldKey.value = closestField.dataset.fieldKey || ''
    } else {
      activeFieldKey.value = ''
    }
  }
  isEditingParagraph.value = false
  unselectParagraph()
}

async function close() {
  window.location.href = route.path
}

async function copyFromExisting(sourceUuid: string, fields: string[]) {
  await mutateWithLoadingState(
    useGraphqlMutation('paragraphsBuilderCopyFromExisting', {
      ...contextVariables.value,
      sourceUuid,
      fields,
    }),
    'Inhalte konnten nicht übernommen werden.',
    'Inhalte erfolgreich übernommen.',
  )
  showTemplates.value = false
}

async function publish() {
  await mutateWithLoadingState(
    useGraphqlMutation('paragraphsBuilderPublish', contextVariables.value),
    'Änderungen konnten nicht publiziert werden.',
    'Änderungen erfolgreich publiziert.',
  )
}

async function undo() {
  await mutateWithLoadingState(
    useGraphqlMutation('paragraphsBuilderUndo', contextVariables.value),
  )
}

async function redo() {
  await mutateWithLoadingState(
    useGraphqlMutation('paragraphsBuilderRedo', contextVariables.value),
  )
}

async function setHistoryIndex(index: number) {
  await mutateWithLoadingState(
    useGraphqlMutation('paragraphsBuilderSetHistoryIndex', {
      ...contextVariables.value,
      index,
    }),
  )
}

async function takeOwnership() {
  await mutateWithLoadingState(
    useGraphqlMutation(
      'paragraphsBuilderTakeOwnership',
      contextVariables.value,
    ),
    'Fehler beim Zuweisen.',
    'Sie sind nun der Besitzer.',
  )
}

const comments = ref<PbComment[]>([])

async function loadComments() {
  comments.value = await useGraphqlQuery('paragraphsBuilderComments', {
    entityType: props.entityType.toUpperCase() as any,
    entityUuid: props.entityUuid,
  }).then((v) => v.data.state?.comments || [])
}

/**
 * Allows using Tab / Shift-Tab to navigate through paragraphs.
 */
function onTabPress(isBackwards: boolean) {
  const paragraphs = [
    ...document.querySelectorAll('[data-uuid]'),
  ] as HTMLElement[]
  if (!paragraphs.length) {
    return
  }

  const currentIndex = selectedParagraph.value
    ? paragraphs.findIndex(
        (v) => v.dataset.uuid === selectedParagraph.value?.uuid,
      )
    : -1

  const targetIndex = modulo(
    isBackwards ? currentIndex - 1 : currentIndex + 1,
    paragraphs.length,
  )
  const targetElement = paragraphs[targetIndex]
  if (!targetElement) {
    return
  }
  const targetItem = buildDraggableItem(targetElement)
  if (!targetItem) {
    return
  }

  if (targetItem.itemType !== 'existing') {
    return
  }

  targetElement.scrollIntoView({
    block: 'nearest',
  })

  eventBus.emit('select', targetItem)
}

function setClipboard(text: string) {
  const type = 'text/plain'
  const blob = new Blob([text], { type })
  const data = [new ClipboardItem({ [type]: blob })]

  navigator.clipboard.write(data).then(
    () => {
      console.log('SUCCESS')
    },
    () => {
      console.log('FAIL')
    },
  )
}

function copySelectedParagraphToClipboard(uuid: string) {
  const element = document.querySelector(`[data-uuid="${uuid}"]`)
  if (element instanceof HTMLElement) {
    const markup = element.outerHTML
    setClipboard(markup)
  }
}

function onKeyDown(e: KeyboardEvent) {
  // For the one person that remapped caps lock to control.
  if (e.key === 'Control' || e.key === 'CapsLock') {
    isPressingControl.value = true
  } else if (e.code === 'Space') {
    isPressingSpace.value = true
  } else if (e.key === 'Tab') {
    if (selectedParagraph.value) {
      e.preventDefault()
      onTabPress(e.shiftKey)
    }
  } else if (e.key === 'c') {
    if (selectedParagraph.value) {
      e.preventDefault()
      copySelectedParagraphToClipboard(selectedParagraph.value.uuid)
    }
  }
}

function onKeyUp() {
  isPressingControl.value = false
  isPressingSpace.value = false
}

useHead({
  bodyAttrs: {
    class: ['pb-body'],
  },
  htmlAttrs: {
    class: ['pb-html-root'],
  },
})

onMounted(async () => {
  // document.documentElement.classList.add('pb-html-root')
  // document.body.classList.add('pb-body')
  await loadAvailableFeatures()
  await loadState(currentLanguage.value)
  if (availableFeatures.value.comment) {
    loadComments()
  }
  document.addEventListener('keydown', onKeyDown)
  document.addEventListener('keyup', onKeyUp)
  document.body.addEventListener('mousedown', onWindowMouseDown)
  eventBus.on('addNewParagraph', addNewParagraph)
  eventBus.on('addReusableParagraph', addReusableParagraph)
  eventBus.on('select', onSelectParagraph)
  eventBus.on('selectAdditional', onSelectParagraphAdditional)
  eventBus.on('editParagraph', onEditParagraph)
  eventBus.on('addClipboardParagraph', addClipboardParagraph)
  eventBus.on('moveParagraph', moveParagraph)
  eventBus.on('moveMultipleParagraphs', moveMultipleParagraphs)
  eventBus.on('draggingStart', onDraggingStart)
  eventBus.on('draggingEnd', onDraggingEnd)

  // Show the import dialog when there are no paragraphs yet and no mutations.
  if (hasNoParagraphs.value && !mutations.value.length) {
    showTemplates.value = true
  }

  isInitializing.value = false
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeyDown)
  document.removeEventListener('keyup', onKeyUp)
  document.body.removeEventListener('mousedown', onWindowMouseDown)
  eventBus.off('addNewParagraph', addNewParagraph)
  eventBus.off('addReusableParagraph', addReusableParagraph)
  eventBus.off('select', onSelectParagraph)
  eventBus.off('selectAdditional', onSelectParagraphAdditional)
  eventBus.off('editParagraph', onEditParagraph)
  eventBus.off('addClipboardParagraph', addClipboardParagraph)
  eventBus.off('moveParagraph', moveParagraph)
  eventBus.off('moveMultipleParagraphs', moveMultipleParagraphs)
  eventBus.off('draggingStart', onDraggingStart)
  eventBus.off('draggingEnd', onDraggingEnd)

  // document.documentElement.classList.remove('pb-html-root')
  // document.body.classList.remove('pb-body')
})

provide('paragraphsBuilderMutatedFields', mutatedFields)
provide('isEditing', true)
provide('paragraphsBuilderEditMode', editMode)
provide('paragraphsBuilderAllowedTypes', allowedTypes)
provide('paragraphsBuilderEditContext', { eventBus, mutatedParagraphOptions })
</script>

<style lang="postcss">
.pb-paragraphs-container {
  &.is-empty {
    min-height: 4rem;
  }
  .draggable {
    outline-offset: -3px;
    &:hover {
      outline: 2px solid rgba(0, 0, 0, 0.3);
    }
    a,
    button {
      pointer-events: none;
    }
  }
}

[data-element-type='existing'] {
  > * {
    user-select: none;
  }
  a,
  button {
    pointer-events: none;
  }
}

.pb-item-focused {
  outline: 4px solid var(--gin-color-primary);
  outline-offset: 0px;
  border-radius: 5px;
}
</style>
