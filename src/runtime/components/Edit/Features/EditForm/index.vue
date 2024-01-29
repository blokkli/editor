<template>
  <Teleport to="body">
    <transition name="bk-slide-in" :duration="200">
      <FormOverlay
        v-if="form"
        id="edit-form"
        :bundle="bundle"
        :title="title"
        @close="onClose"
      >
        <FormFrame
          v-if="formUrl"
          :url="formUrl"
          :form="form"
          @close="onClose"
        />
      </FormOverlay>
    </transition>
  </Teleport>
</template>

<script lang="ts" setup>
import {
  ref,
  computed,
  useBlokkli,
  onMounted,
  onUnmounted,
  defineBlokkliFeature,
} from '#imports'
import { FormOverlay } from '#blokkli/components'
import { getDefinition } from '#blokkli/definitions'
import type { AddNewBlockEvent, EditBlockEvent } from '#blokkli/types'
import FormFrame from './Frame/index.vue'
import type { AdapterFormFrameBuilder } from '#blokkli/adapter'

const { adapter } = defineBlokkliFeature({
  id: 'edit-form',
  icon: 'form',
  label: 'Edit Form',
  description:
    'Listens to edit events and renders an iframe containing the edit form.',
  requiredAdapterMethods: ['formFrameBuilder'],
})

const { types, eventBus, state, context, $t } = useBlokkli()

const form = ref<AdapterFormFrameBuilder | null>(null)

const formUrl = computed<string | undefined>(() => {
  if (form.value) {
    return adapter.formFrameBuilder(form.value)?.url
  }
})

const labelReplacement = computed(() => {
  switch (form.value?.id) {
    case 'entity:edit':
    case 'entity:translate':
      return state.entity.value.label || ''
  }

  if (bundle.value) {
    const definition = types.getType(bundle.value)
    if (definition) {
      return definition.label
    }
  }

  return ''
})

const titleText = computed(() => {
  switch (form.value?.id) {
    case 'block:add':
      return $t('editFormBlockAdd', 'Add @label')
    case 'block:translate':
      return $t('editFormBlockTranslate', 'Translate @label (@language)')
    case 'block:edit':
      return $t('editFormBlockEdit', 'Edit @label')
    case 'entity:edit':
      return $t('editFormEntityEdit', 'Edit @label')
    case 'entity:translate':
      return $t('editFormEntityTranslate', 'Translate "@label" (@language)')
  }

  return $t('edit', 'Edit')
})

const languageReplacement = computed(() => {
  if (form.value && 'langcode' in form.value) {
    const langcode = form.value.langcode
    const language = state.translation.value.availableLanguages?.find(
      (v) => v.id === langcode,
    )
    if (language) {
      return language.name || ''
    }
  }

  return ''
})

const title = computed(() =>
  titleText.value
    .replace('@label', labelReplacement.value)
    .replace('@language', languageReplacement.value),
)

const bundle = computed(() => {
  if (!form.value) {
    return
  }
  if (form.value.id === 'block:add') {
    return form.value.data.bundle
  } else if (form.value.id === 'block:edit') {
    return form.value.data.bundle
  } else if (form.value.id === 'block:translate') {
    return form.value.data.bundle
  }
})

const onClose = () => {
  form.value = null
}

const onItemEdit = (e: EditBlockEvent) => {
  if (!state.canEdit.value) {
    return
  }
  const definition = getDefinition(e.bundle)
  if (definition?.editor?.disableEdit) {
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
    if (!context.value.language) {
      throw new Error(
        'Cannot translate block because language is missing in context.',
      )
    }
    form.value = {
      id: 'block:translate',
      data: e,
      langcode: context.value.language,
    }
    return
  }
  form.value = {
    id: 'block:edit',
    data: e,
  }
}

const onTranslateEntity = (langcode: string) => {
  form.value = {
    id: 'entity:translate',
    langcode,
  }
}

const onBatchTranslate = () =>
  (form.value = {
    id: 'batchTranslate',
  })

const onEditEntity = () =>
  (form.value = {
    id: 'entity:edit',
  })

async function addNewBlock(e: AddNewBlockEvent) {
  if (!state.canEdit.value) {
    return
  }
  const definition = getDefinition(e.bundle)
  if (definition?.editor?.disableEdit) {
    return
  }
  form.value = {
    id: 'block:add',
    data: e,
  }
}

onMounted(() => {
  eventBus.on('item:edit', onItemEdit)
  eventBus.on('translateEntity', onTranslateEntity)
  eventBus.on('batchTranslate', onBatchTranslate)
  eventBus.on('editEntity', onEditEntity)
  eventBus.on('add:block:new', addNewBlock)
})

onUnmounted(() => {
  eventBus.off('item:edit', onItemEdit)
  eventBus.off('translateEntity', onTranslateEntity)
  eventBus.off('batchTranslate', onBatchTranslate)
  eventBus.off('editEntity', onEditEntity)
  eventBus.off('add:block:new', addNewBlock)
})
</script>

<script lang="ts">
export default {
  name: 'EditForm',
}
</script>
