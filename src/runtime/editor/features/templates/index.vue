<template>
  <Teleport :to="ui.mainLayoutElement.value">
    <BlokkliTransition name="slide-in">
      <TemplatesDialog
        v-if="placedAction"
        :field="placedAction.field"
        @close="placedAction = null"
        @submit="onAddTemplate"
      />
    </BlokkliTransition>
  </Teleport>
</template>

<script lang="ts" setup>
import { ref, useBlokkli, defineBlokkliFeature } from '#imports'
import TemplatesDialog from './Dialog/index.vue'
import { BlokkliTransition } from '#blokkli/editor/components'
import { defineAddAction } from '#blokkli/editor/composables'
import type { ActionPlacedData } from '#blokkli/editor/types/actions'

const { adapter } = defineBlokkliFeature({
  id: 'templates',
  icon: 'bk_mdi_architecture',
  label: 'Templates',
  description: 'Add blocks from templates.',
  requiredAdapterMethods: ['templatesAdd', 'templatesSearch'],
  dependencies: ['add-list'],
})

const { state, $t, ui } = useBlokkli()

const placedAction = ref<ActionPlacedData | null>(null)

const onAddTemplate = async (templateUuid: string) => {
  if (!placedAction.value || !adapter.templatesAdd) {
    return
  }

  await state.mutateWithLoadingState(() =>
    adapter.templatesAdd!({
      templateUuid,
      host: placedAction.value!.host,
      afterUuid: placedAction.value!.preceedingUuid,
    }),
  )

  placedAction.value = null
}

defineAddAction(() => {
  return {
    id: 'template',
    icon: 'bk_mdi_architecture',
    color: 'orange',
    title: $t('templatesAddTemplate', 'Add template'),
    weight: 10,
    description: $t(
      'templatesAddTemplateDescription',
      '<p>Drag the icon into the page to add blocks from a template.</p>',
    ),
    callback: (action: ActionPlacedData) => {
      placedAction.value = action
    },
  }
})
</script>

<script lang="ts">
export default {
  name: 'Templates',
}
</script>
