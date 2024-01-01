<template>
  <div>
    <EntityForm :fields="fields" @submit="onSubmit" />
  </div>
</template>

<script lang="ts" setup>
import { entityStorageManager } from '~/app/mock/entityStorage'
import { getEditState } from '~/app/mock/state'

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
const mutatedState = editState.getMutatedState(page)

const fields = Object.values(page.fields)

const onSubmit = (values: Record<string, string>) => {
  editState.addMutation('edit_entity', {
    values,
  })
  editState.getMutatedState(page)
  router.push({ name: 'blokkli-form-redirect' })
}
</script>
