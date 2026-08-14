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
import type { FormValue } from '~/components/EntityForm/index.vue'

definePageMeta({
  layout: 'form',
})

const router = useRouter()

const entityType = useParamString('entityType')
const entityUuid = useParamString('entityUuid')
const uuid = useQueryString('uuid')
const page = entityStorageManager.getContent(entityUuid.value)

if (!page) {
  throw new Error('Failed to load page with UUID: ' + entityUuid.value)
}

const editState = getEditState(entityType.value, entityUuid.value)
const mutatedState = await editState.getMutatedState(page, 'en')

const block = mutatedState.context.getProxy(uuid.value)?.block

if (!block) {
  throw new Error('Block with this UUID does not exist.')
}

const fields = Object.values(block.fields)

const onSubmit = async (values: Record<string, FormValue>) => {
  editState.addMutation('edit', {
    uuid: uuid.value,
    values,
  })
  await editState.getMutatedState(page, 'en')
  router.push({ name: 'blokkli-form-redirect' })
}
</script>
