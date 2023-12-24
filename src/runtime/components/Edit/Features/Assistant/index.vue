<template>
  <Teleport to="body">
    <transition name="bk-slide-in" :duration="200">
      <Overlay
        v-if="featureAvailable && placedAction"
        @close="onClose"
        @submit="onSubmit"
      />
    </transition>
  </Teleport>

  <PluginAddAction
    v-if="featureAvailable"
    type="assistant"
    title="AI Assistant"
    icon="robot"
    color="rose"
    @placed="placedAction = $event"
  />

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
import type { ActionPlacedEvent, AssistantResult } from '#blokkli/types'
import { useBlokkli, onMounted, onBeforeUnmount } from '#imports'
// import { PluginItemAction } from '#blokkli/plugins'
import { PluginAddAction } from '#blokkli/plugins'
import Overlay from './Overlay/index.vue'
import EditForm from './EditForm/index.vue'

const { adapter, state, text } = useBlokkli()

const featureAvailable = computed(
  () => !!(adapter.assistantGetResults && adapter.assistantAddBlockFromResult),
)

const placedAction = ref<ActionPlacedEvent | null>(null)

const showEdit = ref(false)

const onEdit = () => {}

const onClose = () => {
  placedAction.value = null
}

const onSubmit = async (result: AssistantResult) => {
  if (adapter.assistantAddBlockFromResult && placedAction.value) {
    await state.mutateWithLoadingState(
      adapter.assistantAddBlockFromResult({
        result,
        host: placedAction.value.host,
        preceedingUuid: placedAction.value.preceedingUuid,
      }),
      text('assistantAddResultError'),
    )
  }

  onClose()
}
</script>
