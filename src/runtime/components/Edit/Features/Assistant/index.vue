<template>
  <Teleport to="body">
    <Transition appear name="bk-slide-up">
      <Overlay
        v-if="featureAvailable && host && field"
        @close="onClose"
        @submit="onSubmit"
      />
    </Transition>
  </Teleport>
  <!-- <PluginItemAction -->
  <!--   v-if="featureAvailable" -->
  <!--   :title="text('assistantBlockActionTooltip')" -->
  <!--   :active="showEdit" -->
  <!--   icon="robot" -->
  <!--   @click="showEdit = !showEdit" -->
  <!-- > -->
  <!--   <template v-if="showEdit" #default="{ uuids }"> -->
  <!--     <EditForm /> -->
  <!--   </template> -->
  <!-- </PluginItemAction> -->
</template>

<script lang="ts" setup>
import type {
  ActionPlacedEvent,
  AssistantResult,
  BlokkliFieldElement,
  DraggableHostData,
} from '#blokkli/types'
import { useBlokkli, onMounted, onBeforeUnmount } from '#imports'
import { PluginItemAction } from '#blokkli/plugins'
import Overlay from './Overlay/index.vue'
import EditForm from './EditForm/index.vue'

const { eventBus, adapter, state, text } = useBlokkli()

const featureAvailable = computed(
  () => !!(adapter.assistantGetResults && adapter.assistantAddBlockFromResult),
)

const preceedingUuid = ref('')
const host = ref<DraggableHostData | null>(null)
const field = ref<BlokkliFieldElement | null>(null)

const showEdit = ref(false)

const onEdit = () => {}

const onClose = () => {
  preceedingUuid.value = ''
  host.value = null
  field.value = null
}

const onSubmit = async (result: AssistantResult) => {
  if (adapter.assistantAddBlockFromResult && host.value) {
    await state.mutateWithLoadingState(
      adapter.assistantAddBlockFromResult({
        result,
        host: host.value,
        preceedingUuid: preceedingUuid.value,
      }),
      text('assistantAddResultError'),
    )
  }

  onClose()
}

const onActionPlaced = (e: ActionPlacedEvent) => {
  if (e.action.actionType !== 'assistant') {
    return
  }
  preceedingUuid.value = e.preceedingUuid || ''
  host.value = e.host
  field.value = e.field
}

onMounted(() => {
  if (!featureAvailable.value) {
    return
  }
  eventBus.on('action:placed', onActionPlaced)
})

onBeforeUnmount(() => {
  eventBus.off('action:placed', onActionPlaced)
})
</script>
