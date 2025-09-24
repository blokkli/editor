<template>
  <div>
    <EntityForm :fields="fields" @submit="onSubmit" />
  </div>
</template>

<script lang="ts" setup>
import {
  definePageMeta,
  useQueryString,
  useRouter,
  useParamString,
} from '#imports'
import { entityStorageManager } from '#mock/entityStorage'
import { getEditState } from '#mock/state'

definePageMeta({
  layout: 'form',
})

const router = useRouter()

const entityType = useParamString('entityType')
const entityUuid = useParamString('entityUuid')
const uuid = useQueryString('uuid')
const langcode = useQueryString('langcode')
const page = entityStorageManager.getContent(entityUuid.value)

if (!page) {
  throw new Error('Failed to load page with UUID: ' + uuid.value)
}

const editState = getEditState(entityType.value, entityUuid.value)
const mutatedState = await editState.getMutatedState(page)

const block = mutatedState.context.getProxy(uuid.value)?.block

if (!block) {
  throw new Error('Block with this UUID does not exist.')
}

const translation = block.getTranslation(langcode.value)

const fields = Object.values(translation.fields)

const onSubmit = async (values: Record<string, string>) => {
  editState.addMutation('edit_translation', {
    uuid: uuid.value,
    values,
    langcode: langcode.value,
  })
  await editState.getMutatedState(page)
  router.push({ name: 'blokkli-form-redirect' })
}
</script>
