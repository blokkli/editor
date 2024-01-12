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
import { entityStorageManager } from '~/app/mock/entityStorage'
import { getEditState } from '~/app/mock/state'

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
const mutatedState = editState.getMutatedState(page)

const block = mutatedState.context.getProxy(uuid.value)?.block

if (!block) {
  throw new Error('Block with this UUID does not exist.')
}

const fields = Object.values(block.fields)

const onSubmit = (values: Record<string, string>) => {
  editState.addMutation('edit', {
    uuid: uuid.value,
    values,
  })
  editState.getMutatedState(page)
  router.push({ name: 'blokkli-form-redirect' })
}
</script>
