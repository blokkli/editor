<template>
  <Teleport :to="ui.mainLayoutElement.value">
    <BlokkliTransition name="slide-up">
      <DialogModal
        v-if="uuid"
        id="charts-editor"
        :title="$t('chartsEditorTitle', 'Edit chart')"
        :submit-label="$t('chartsEditorSave', 'Save chart')"
        is-danger
        hide-buttons
        :width="1600"
        @submit="onSubmit"
        @cancel="onCancel"
      >
        <ChartsEditor :uuid />
      </DialogModal>
    </BlokkliTransition>
  </Teleport>
</template>

<script setup lang="ts">
import { onBlokkliEvent } from '#blokkli/editor/composables'
import { defineBlokkliFeature, ref, useBlokkli } from '#imports'
import { DialogModal, BlokkliTransition } from '#blokkli/editor/components'
import ChartsEditor from './Editor/index.vue'

defineBlokkliFeature({
  id: 'charts',
  icon: 'bk_mdi_area_chart',
  label: 'Charts',
  description: 'Add and edit interactive charts.',
})

const { ui, $t } = useBlokkli()

const uuid = ref<string | null>(null)

function onCancel() {
  uuid.value = null
}

function onSubmit() {
  uuid.value = null
}

onBlokkliEvent('fragment:edit', (data) => {
  if (data.name === 'blokkli_chart') {
    uuid.value = data.uuid
  } else {
    uuid.value = null
  }
})
</script>
