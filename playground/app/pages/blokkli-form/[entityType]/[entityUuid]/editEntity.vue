<template>
  <div>
    <EntityForm :fields="fields" @submit="onSubmit" />
  </div>
</template>

<script lang="ts" setup>
import { definePageMeta, useRouter, useParamString } from '#imports'
import { entityStorageManager } from '#mock/entityStorage'
import { getEditState } from '#mock/state'
import type { FormValue } from '~/components/EntityForm/index.vue'

definePageMeta({
  layout: 'form',
})

const router = useRouter()

const entityType = useParamString('entityType')
const entityUuid = useParamString('entityUuid')
const page = entityStorageManager.getContent(entityUuid.value)
if (!page) {
  throw new Error('Page with this UUID does not exist.')
}

const editState = getEditState(entityType.value, entityUuid.value)
const mutatedState = await editState.getMutatedState(page, 'en')

const fields = Object.values(page.fields)

const onSubmit = async (values: Record<string, FormValue>) => {
  editState.addMutation('edit_entity', {
    values,
  })
  await editState.getMutatedState(page, 'en')
  router.push({ name: 'blokkli-form-redirect' })
}
</script>
