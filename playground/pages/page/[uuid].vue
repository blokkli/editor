<template>
  <BlokkliProvider
    v-if="page"
    entity-type="content"
    entity-bundle="page"
    :entity-uuid="page.uuid"
    :can-edit="true"
  >
    <div>
      <h1>{{ title }}</h1>

      <BlokkliField v-bind="fieldContent" />
      <BlokkliField v-bind="fieldFooter" />
    </div>
  </BlokkliProvider>
</template>

<script lang="ts" setup>
import { mapMockField, state } from '@/app/mock/state'

const route = useRoute()

const uuid = route.params.uuid

const page = state.pages.find((v) => v.uuid === uuid)

if (!page) {
  throw new Error('page not found')
}

const fieldContent = computed(() => {
  return mapMockField(page.content())
})

const fieldFooter = computed(() => {
  return mapMockField(page.footer())
})

const title = computed(() => page.title().getText())
</script>
