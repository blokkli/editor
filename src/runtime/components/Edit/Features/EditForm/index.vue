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
import { ref, computed, useBlokkli, defineBlokkliFeature } from '#imports'
import { FormOverlay } from '#blokkli/components'
import { getDefinition } from '#blokkli/definitions'
import FormFrame from './Frame/index.vue'
import type { AdapterFormFrameBuilder } from '#blokkli/adapter'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import type { EntityTranslation } from '#blokkli/types'

const { adapter } = defineBlokkliFeature({
  id: 'edit-form',
  icon: 'form',
  label: 'Edit Form',
  description:
    'Listens to edit events and renders an iframe containing the edit form.',
  requiredAdapterMethods: ['formFrameBuilder'],
})

const { types, state, context, $t, dom } = useBlokkli()

const form = ref<AdapterFormFrameBuilder | null>(null)

const formUrl = computed<string | undefined>(() => {
  if (form.value) {
    if (
      form.value.id === 'entity:translate' &&
      form.value.translation.editUrl
    ) {
      return form.value.translation.editUrl
    }
    return adapter.formFrameBuilder(form.value)?.url
  }

  return undefined
})

const labelReplacement = computed(() => {
  switch (form.value?.id) {
    case 'entity:edit':
    case 'entity:translate':
      return state.entity.value.label || ''
  }

  if (bundle.value) {
    const definition = types.getBlockBundleDefinition(bundle.value)
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
  if (
    form.value &&
    (form.value.id === 'block:add' ||
      form.value.id === 'block:edit' ||
      form.value.id === 'block:translate')
  ) {
    return form.value.data.bundle
  }

  return undefined
})

const onClose = () => {
  form.value = null
}

onBlokkliEvent('item:edit', (e) => {
  if (!state.canEdit.value) {
    return
  }
  const block = dom.findBlock(e.uuid)
  if (!block) {
    return
  }
  const definition = getDefinition(
    e.bundle,
    block.hostFieldListType,
    block.parentBlockBundle,
  )
  if (definition?.editor?.disableEdit) {
    return
  }
  if (state.editMode.value === 'translating') {
    const type = types.getBlockBundleDefinition(e.bundle)
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
})

onBlokkliEvent('translateEntity', (translation: EntityTranslation) => {
  form.value = {
    id: 'entity:translate',
    translation,
  }
})

onBlokkliEvent('batchTranslate', () => {
  form.value = {
    id: 'batchTranslate',
  }
})

onBlokkliEvent('editEntity', () => {
  form.value = {
    id: 'entity:edit',
  }
})

onBlokkliEvent('add:block:new', (e) => {
  if (!state.canEdit.value) {
    return
  }
  const field = dom.findField(e.host.uuid, e.host.fieldName)
  if (field) {
    const definition = getDefinition(
      e.bundle,
      field.fieldListType,
      field.hostEntityBundle as any,
    )
    if (definition?.editor?.disableEdit) {
      return
    }
  }
  form.value = {
    id: 'block:add',
    data: e,
  }
})
</script>

<script lang="ts">
export default {
  name: 'EditForm',
}
</script>
