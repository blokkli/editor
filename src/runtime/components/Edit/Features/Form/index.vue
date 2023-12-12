<template>
  <Teleport to="body">
    <transition name="bk-slide-in" :duration="200">
      <div
        v-if="form"
        class="bk bk-drupal-modal"
        @click.capture.stop
        @mousedown.prevent.stop
      >
        <div class="bk-drupal-modal-background bk-overlay" />
        <Resizable class="bk-drupal-modal-resizable">
          <FormHeader :form="form" @close="onClose" />
          <FormFrame
            v-if="formUrl"
            :url="formUrl"
            :form="form"
            @close="onClose"
            @update-width="updateWidth"
          />
        </Resizable>
      </div>
    </transition>
  </Teleport>
</template>

<script lang="ts" setup>
import { ref, computed, useBlokkli, onMounted, onUnmounted } from '#imports'

import { Resizable } from '#blokkli/components'
import { getDefinition } from '#blokkli/definitions'
import type {
  AddNewBlokkliItemEvent,
  EditBlokkliItemEvent,
} from '#blokkli/types'
import FormFrame from './Frame/index.vue'
import FormHeader from './Title/index.vue'
import type { AdapterFormFrameBuilder } from '#blokkli/adapter'

const { types, eventBus, state, adapter } = useBlokkli()

const form = ref<AdapterFormFrameBuilder | null>(null)
const dialogWidth = ref(400)

const updateWidth = (width: number) => (dialogWidth.value = width)

const formUrl = computed<string | undefined>(() => {
  if (form.value && adapter.formFrameBuilder) {
    return adapter.formFrameBuilder(form.value)?.url
  }
})

const onClose = () => {
  form.value = null
}

const onItemEdit = (e: EditBlokkliItemEvent) => {
  if (!state.canEdit.value) {
    return
  }
  const definition = getDefinition(e.bundle)
  if (definition?.disableEdit) {
    return
  }
  if (state.editMode.value === 'translating') {
    const type = types.allTypes.value.find((v) => v.id === e.bundle)
    if (!type) {
      return
    }

    if (!type.isTranslatable) {
      return
    }
  }
  form.value = {
    id: 'block:edit',
    data: e,
  }
}

const onTranslateEntity = (langcode: string) => {
  form.value = {
    id: 'entity:translate',
    langcode,
  }
}

const onBatchTranslate = () =>
  (form.value = {
    id: 'batchTranslate',
  })

const onEditEntity = () =>
  (form.value = {
    id: 'entity:edit',
  })

async function addNewBlokkliItem(e: AddNewBlokkliItemEvent) {
  if (!state.canEdit.value) {
    return
  }
  const definition = getDefinition(e.item.itemBundle)
  if (definition?.disableEdit) {
    return
  }
  form.value = {
    id: 'block:add',
    data: e,
  }
}

onMounted(() => {
  eventBus.on('item:edit', onItemEdit)
  eventBus.on('translateEntity', onTranslateEntity)
  eventBus.on('batchTranslate', onBatchTranslate)
  eventBus.on('editEntity', onEditEntity)
  eventBus.on('addNewBlokkliItem', addNewBlokkliItem)
})

onUnmounted(() => {
  eventBus.off('item:edit', onItemEdit)
  eventBus.off('translateEntity', onTranslateEntity)
  eventBus.off('batchTranslate', onBatchTranslate)
  eventBus.off('editEntity', onEditEntity)
  eventBus.off('addNewBlokkliItem', addNewBlokkliItem)
})
</script>
