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
import { getParagraphBundles } from '#mock/state/Paragraph'

definePageMeta({
  layout: 'form',
})

const router = useRouter()

const entityType = useParamString('entityType')
const entityUuid = useParamString('entityUuid')
const bundle = useQueryString('bundle')
const hostEntityType = useQueryString('hostEntityType')
const hostEntityUuid = useQueryString('hostEntityUuid')
const hostField = useQueryString('hostField')
const preceedingUuid = useQueryString('preceedingUuid')
const page = entityStorageManager.getContent(entityUuid.value)

if (!page) {
  throw new Error('Failed to load page with UUID: ' + entityUuid.value)
}

const editState = getEditState(entityType.value, entityUuid.value)

const blockBundle = getParagraphBundles().find((v) => v.bundle === bundle.value)

if (!blockBundle) {
  throw new Error('Bundle does not exist: ' + bundle.value)
}

const fields = blockBundle.getFieldDefintions()

const defaultValues = blockBundle.getDefaultValues()

fields.forEach((field) => {
  const defaultValue = defaultValues[field.id]
  if (defaultValue) {
    field.setList([defaultValue])
  }
})

const onSubmit = async (values: Record<string, string>) => {
  editState.addMutation('add', {
    bundle: bundle.value,
    values,
    hostEntityType: hostEntityType.value,
    hostEntityUuid: hostEntityUuid.value,
    hostField: hostField.value,
    preceedingUuid: preceedingUuid.value,
  })
  await editState.getMutatedState(page, 'en')
  router.push({ name: 'blokkli-form-redirect' })
}
</script>
