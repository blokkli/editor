<template>
  <Teleport to="body">
    <transition name="bk-slide-in" :duration="200">
      <div
        v-if="modalUrl"
        class="bk-drupal-modal"
        @click.capture.stop
        @mousedown.prevent.stop
      >
        <div class="bk-drupal-modal-background bk-overlay" />
        <Resizable class="bk-drupal-modal-resizable">
          <div class="bk-drupal-modal-header">
            <ItemIcon v-if="bundle" :bundle="bundle" />
            <div v-else class="bk-blokkli-item-icon">
              <Icon name="form" />
            </div>
            <span>{{ title }}</span>
            <button @click="close">
              <Icon name="close" />
            </button>
          </div>
          <div class="bk-drupal-modal-iframe">
            <iframe
              ref="iframe"
              allowtransparency
              :src="modalUrl"
              class="bk-drupal-iframe"
              @load="onIFrameLoad"
            />
          </div>
        </Resizable>
      </div>
    </transition>
  </Teleport>
</template>

<script lang="ts" setup>
import { Resizable } from '#blokkli/components'
import { Icon, ItemIcon } from '#blokkli/components'
import { getDefinition } from '#blokkli/definitions'
import type {
  AddNewBlokkliItemEvent,
  EditBlokkliItemEvent,
} from '#blokkli/types'

const { types, eventBus, runtimeConfig, state, context } = useBlokkli()

const currentLanguage = computed(() => context.value.language)

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
  if (
    langcode !== currentLanguage.value ||
    state.editMode.value === 'translating'
  ) {
    if (state.translation.value.availableLanguages) {
      const match = state.translation.value.availableLanguages.find(
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
    if (entityTypeInForm.value === runtimeConfig.itemEntityType) {
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

function onItemEdit(e: EditBlokkliItemEvent) {
  if (!state.canEdit.value) {
    return
  }
  const definition = getDefinition(e.bundle)
  if (definition?.disableEdit) {
    return
  }
  if (state.editMode.value === 'translating') {
    const type = types.allTypes.value.find((v) => v.id === e.bundle)
    if (!type) {
      return
    }

    if (!type.isTranslatable) {
      return
    }
  }
  bundle.value = e.bundle
  setModalUrl(
    `/paragraphs_builder/${context.value.entityType}/${context.value.entityUuid}/edit/${e.uuid}`,
  )
}

function onTranslateEntity(langcode: string) {
  editLangcode.value = langcode
  entityTypeInForm.value = 'entity'
  setModalUrl(
    `/${context.value.entityType}/${state.entity.value.id}/translations/add/${state.translation.value.sourceLanguage}/${langcode}`,
    langcode,
  )
}

function onBatchTranslate() {
  titleOverride.value = 'Alle Paragraphen übersetzen'
  setModalUrl(
    `/paragraphs_builder/${context.value.entityType}/${context.value.entityUuid}/translate-paragraphs`,
  )
}

function onEditEntity() {
  entityTypeInForm.value = 'entity'
  if (state.entity.value.editUrl) {
    const prefix = getModalPrefix()
    const queryParam = getModalQueryParams(prefix)
    modalUrl.value = state.entity.value.editUrl + queryParam
  } else {
    setModalUrl(`/${context.value.entityType}/${state.entity.value.id}/edit`)
  }
}

async function addNewBlokkliItem(e: AddNewBlokkliItemEvent) {
  if (!state.canEdit.value) {
    return
  }
  const definition = getDefinition(e.item.itemBundle)
  if (definition?.disableEdit) {
    return
  }

  bundle.value = e.type
  entityTypeInForm.value = runtimeConfig.itemEntityType as any
  editLangcode.value = currentLanguage.value || ''
  setModalUrl(
    '/' +
      [
        'paragraphs_builder',
        context.value.entityType,
        context.value.entityUuid,
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

  eventBus.on('item:edit', onItemEdit)
  eventBus.on('translateEntity', onTranslateEntity)
  eventBus.on('batchTranslate', onBatchTranslate)
  eventBus.on('editEntity', onEditEntity)
  eventBus.on('addNewBlokkliItem', addNewBlokkliItem)
})

onUnmounted(() => {
  window.removeEventListener('message', onMessage)
  eventBus.off('item:edit', onItemEdit)
  eventBus.off('translateEntity', onTranslateEntity)
  eventBus.off('batchTranslate', onBatchTranslate)
  eventBus.off('editEntity', onEditEntity)
  eventBus.off('addNewBlokkliItem', addNewBlokkliItem)
})
</script>

<style lang="postcss"></style>
