<template>
  <div :data-provider-uuid="uuid">
    <template
      v-if="uuid && entityType && bundle && (isPreviewing || isEditing)"
    >
      <PbPreviewProvider
        v-if="isPreviewing"
        :entity-type="entityType"
        :entity-uuid="uuid"
        :bundle="bundle"
      >
        <slot
          :is-editing="isEditing"
          :can-edit="canEdit"
          :is-preview="isPreviewing"
        ></slot>
      </PbPreviewProvider>
      <PbEditProvider
        v-else-if="isEditing"
        :entity-type="entityType"
        :entity-uuid="uuid"
        :bundle="bundle"
      >
        <slot
          :is-editing="isEditing"
          :can-edit="canEdit"
          :is-preview="isPreviewing"
        ></slot>
      </PbEditProvider>
    </template>

    <slot
      v-else
      :is-editing="isEditing"
      :can-edit="canEdit"
      :is-preview="isPreviewing"
    ></slot>

    <PbEditIndicator v-if="showIndicator" :uuid="uuid" @edit="edit" />
  </div>
</template>

<script lang="ts" setup>
const PbPreviewProvider = defineAsyncComponent(() => {
  return import('./PreviewProvider.vue')
})

const PbEditProvider = defineAsyncComponent(() => {
  return import('./EditProvider.vue')
})

const PbEditIndicator = defineAsyncComponent(() => {
  return import('./EditIndicator.vue')
})

const route = useRoute()
const router = useRouter()
const language = useCurrentLanguage()

const props = withDefaults(
  defineProps<{
    uuid: string
    canEdit: boolean
    entityType: string
    bundle: string
    tag?: string
  }>(),
  {
    tag: 'div',
  },
)

const isEditing = computed(() => {
  return props.canEdit && !!props.uuid && route.query.pbEditing === props.uuid
})

const isPreviewing = computed(() => {
  return props.uuid && route.query.pbPreview === props.uuid
})

const showIndicator = computed(
  () => props.canEdit && !route.query.pbEditing && !route.query.pbPreview,
)

function edit() {
  router.push({
    query: {
      pbEditing: props.uuid,
      language: language.value,
    },
  })
}
</script>
