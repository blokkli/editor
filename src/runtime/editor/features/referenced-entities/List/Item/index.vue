<template>
  <a
    ref="rootEl"
    :href="editUrl"
    target="_blank"
    rel="noopener"
    class="flex px-10 py-8 hover:bg-mono-600"
    @click.prevent="isEditing = true"
  >
    <div class="text-mono-200 flex items-center gap-10 pl-2">
      <div
        class="size-30 bg-mono-600 text-mono-100 border border-mono-300 flex items-center justify-center rounded-md"
      >
        <Icon :name="icon" class="size-20" />
      </div>
      <div>
        <div class="text-sm font-bold max-w-[280px] truncate leading-none">
          {{ label }}
        </div>
        <div class="text-xs">
          <span>{{ bundleLabel }}</span>
        </div>
      </div>
    </div>
  </a>
  <NestedEditorOverlay
    v-if="editUrl && isEditing"
    :url="editUrl"
    :uuid="entityUuid"
    :element
    :title="editorOverlayTitle"
    theme="accent"
    :icon
    @close="onSubmitEdit"
    @submit="onSubmitEdit"
  />
</template>

<script setup lang="ts">
import { computed, useBlokkli, ref, useTemplateRef } from '#imports'
import type { ReferencedEntity } from '../../types'
import { NestedEditorOverlay, Icon } from '#blokkli/editor/components'
import type { BlokkliIcon } from '#blokkli-build/icons'

const props = defineProps<ReferencedEntity>()

const { adapter, $t, eventBus } = useBlokkli()

const isEditing = ref(false)

const element = useTemplateRef('rootEl')

const bundleLabel = computed(() => {
  if (!adapter.getEntityBundleInfo) {
    return props.entityBundle
  }

  return (
    adapter.getEntityBundleInfo(props.entityType, props.entityBundle)?.label ??
    props.entityBundle
  )
})

const editorOverlayTitle = computed(() => {
  return $t('referencedEntitiesEditorOverlayTitle', 'Edit "@label"').replace(
    '@label',
    props.label,
  )
})

const icon = computed<BlokkliIcon>(() => {
  if (props.entityBundle.includes('image')) {
    return 'bk_mdi_image'
  } else if (props.entityBundle.includes('video')) {
    return 'bk_mdi_play_circle'
  } else if (
    props.entityBundle === 'document' ||
    props.entityBundle === 'file'
  ) {
    return 'bk_mdi_docs'
  } else if (
    props.entityBundle.includes('person') ||
    props.entityBundle.includes('contact')
  ) {
    return 'bk_mdi_person-fill'
  }

  return 'bk_mdi_join'
})

function onSubmitEdit() {
  eventBus.emit('reloadState')
  isEditing.value = false
}
</script>
