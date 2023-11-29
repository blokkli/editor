<template>
  <Teleport to="body">
    <transition name="pb-slide-in" :duration="200">
      <div
        v-if="modalUrl"
        class="pb-drupal-modal"
        @click.capture=""
        @mousedown.prevent.stop=""
      >
        <div class="pb-drupal-modal-background pb-overlay"></div>
        <Resizable class="pb-drupal-modal-resizable">
          <div class="pb-drupal-modal-header">
            <ParagraphIcon v-if="bundle" :bundle="bundle" />
            <div v-else class="pb-paragraph-icon">
              <Icon name="form" />
            </div>
            <span>{{ title }}</span>
            <button @click="close">
              <Icon name="close" />
            </button>
          </div>
          <div class="pb-drupal-modal-iframe">
            <iframe
              allowtransparency
              :src="modalUrl"
              class="pb-drupal-iframe"
              ref="iframe"
              @load="onIFrameLoad"
            />
          </div>
        </Resizable>
      </div>
    </transition>
  </Teleport>
</template>

<script lang="ts" setup>
import { Resizable } from '#pb/components'
import { Icon, ParagraphIcon } from '#pb/components'
import { getDefinition } from '#nuxt-paragraphs-builder/definitions'
import { AddNewParagraphEvent, EditParagraphEvent } from '#pb/types'

const {
  types,
  eventBus,
  currentLanguage,
  runtimeConfig,
  entity,
  entityType,
  entityUuid,
  translationState,
  canEdit,
  editMode,
} = useParagraphsBuilderStore()

const modalUrl = ref('')
const bundle = ref('')
const editLangcode = ref('')
const entityTypeInForm = ref<'entity' | 'paragraph' | ''>('')
const titleOverride = ref('')

const close = () => {
  modalUrl.value = ''
  bundle.value = ''
  editLangcode.value = ''
  entityTypeInForm.value = ''
  titleOverride.value = ''
}

function getModalPrefix(providedLangcode?: string) {
  const langcode = providedLangcode || currentLanguage.value
  return runtimeConfig.langcodeWithoutPrefix &&
    runtimeConfig.langcodeWithoutPrefix === langcode
    ? ''
    : '/' + langcode
}

function getModalQueryParams(prefix: string) {
  return `?paragraphsBuilder=true&destination=${prefix}/paragraphs_builder/redirect`
}

function setModalUrl(path: string, providedLangcode?: string) {
  const prefix = getModalPrefix(providedLangcode)
  const queryParam = getModalQueryParams(prefix)
  modalUrl.value = prefix + path + queryParam
}

const dialogWidth = ref(0)
const iframe = ref<HTMLIFrameElement | null>(null)

const titleSuffix = computed(() => {
  const langcode = editLangcode.value || currentLanguage.value
  if (langcode !== currentLanguage.value) {
    if (translationState.value.availableLanguages) {
      const match = translationState.value.availableLanguages.find(
        (v) => v.id === langcode,
      )?.name
      if (match) {
        return ` übersetzen (${match})`
      }
    }
  }

  return ' bearbeiten'
})

const titlePrefix = computed(() => {
  if (entityTypeInForm.value === 'entity') {
    return 'Seite '
  }

  return (
    types.allTypes.value.find((v) => v.id === bundle.value)?.label ||
    bundle.value
  )
})

const title = computed(
  () => titleOverride.value || titlePrefix.value + titleSuffix.value,
)

function onMessage(e: MessageEvent): void {
  if (!e.data || typeof e.data !== 'object') {
    return
  }
  if (e.data.event !== 'PARAGRAPHS_BUILDER') {
    return
  }

  const { action, value } = e.data

  if (action === 'SAVE') {
    if (entityTypeInForm.value === 'paragraph') {
      eventBus.emit('reloadState')
    } else {
      eventBus.emit('reloadEntity')
    }
    close()
  } else if (action === 'DIALOG_WIDTH') {
    dialogWidth.value = value
  } else if (action === 'CANCEL') {
    close()
  }
}

function onIFrameLoad() {
  if (iframe.value?.contentWindow) {
    iframe.value.contentWindow?.focus()
  }
}

function onEditParagraph(e: EditParagraphEvent) {
  if (!canEdit.value) {
    return
  }
  const definition = getDefinition(e.bundle)
  if (definition?.disableEdit) {
    return
  }
  if (editMode.value === 'translating') {
    const type = types.allTypes.value.find((v) => v.id === e.bundle)
    if (!type) {
      return
    }

    if (!type.isTranslatable) {
      return
    }
  }
  bundle.value = e.bundle
  setModalUrl(`/paragraphs_builder/${entityType}/${entityUuid}/edit/${e.uuid}`)
}

function onTranslateEntity(langcode: string) {
  editLangcode.value = langcode
  entityTypeInForm.value = 'entity'
  setModalUrl(
    `/${entityType}/${entity.value.id}/translations/add/${translationState.value.sourceLanguage}/${langcode}`,
    langcode,
  )
}

function onBatchTranslate() {
  titleOverride.value = 'Alle Paragraphen übersetzen'
  setModalUrl(
    `/paragraphs_builder/${entityType}/${entityUuid}/translate-paragraphs`,
  )
}

function onEditEntity() {
  entityTypeInForm.value = 'entity'
  if (entity.value.editUrl) {
    const prefix = getModalPrefix()
    const queryParam = getModalQueryParams(prefix)
    modalUrl.value = entity.value.editUrl + queryParam
  } else {
    setModalUrl(`/${entityType}/${entity.value.id}/edit`)
  }
}

async function addNewParagraph(e: AddNewParagraphEvent) {
  if (!canEdit.value) {
    return
  }
  const definition = getDefinition(e.item.paragraphType)
  if (definition?.disableEdit) {
    return
  }

  bundle.value = e.type
  entityTypeInForm.value = 'paragraph'
  editLangcode.value = currentLanguage.value || ''
  setModalUrl(
    '/' +
      [
        'paragraphs_builder',
        entityType,
        entityUuid,
        'add',
        e.type,
        e.host.type,
        e.host.uuid,
        e.host.fieldName,
        e.afterUuid,
      ]
        .filter(Boolean)
        .join('/'),
  )
}

onMounted(() => {
  window.addEventListener('message', onMessage)

  eventBus.on('editParagraph', onEditParagraph)
  eventBus.on('translateEntity', onTranslateEntity)
  eventBus.on('batchTranslate', onBatchTranslate)
  eventBus.on('editEntity', onEditEntity)
  eventBus.on('addNewParagraph', addNewParagraph)
})

onUnmounted(() => {
  window.removeEventListener('message', onMessage)
  eventBus.off('editParagraph', onEditParagraph)
  eventBus.off('translateEntity', onTranslateEntity)
  eventBus.off('batchTranslate', onBatchTranslate)
  eventBus.off('editEntity', onEditEntity)
  eventBus.off('addNewParagraph', addNewParagraph)
})
</script>

<style lang="postcss"></style>
