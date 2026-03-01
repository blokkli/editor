<template>
  <Teleport v-if="ui.mainLayoutElement.value" :to="ui.mainLayoutElement.value">
    <div class="bk bk-approval-toolbar bk-control">
      <button class="bk-approval-toolbar-nav" @click="prev">
        <Icon name="bk_mdi_chevron_left" />
      </button>
      <button class="bk-approval-toolbar-nav" @click="next">
        <Icon name="bk_mdi_chevron_right" />
      </button>

      <div class="bk-approval-toolbar-info">
        <span class="bk-approval-toolbar-counter">
          {{ currentIndex + 1 }} / {{ items.length }}
        </span>
        <span class="bk-approval-toolbar-label">
          {{ currentItem.fieldLabel }}
          <template v-if="bundleLabel"> &middot; {{ bundleLabel }}</template>
        </span>
      </div>

      <FormToggle
        :model-value="selected[currentItem.id]"
        :label="$t('aiAgentApprovalAccept', 'Accept')"
        @update:model-value="toggleCurrent"
      />

      <div v-if="!selected[currentItem.id]" class="bk-approval-toolbar-reason">
        <input
          type="text"
          :value="reasons[currentItem.id]"
          :placeholder="
            $t(
              'aiAgentBatchRewriteReasonPlaceholder',
              'Reason for rejection (optional)',
            )
          "
          @input="onReasonInput"
        />
      </div>

      <button class="bk-approval-toolbar-apply" @click="$emit('apply')">
        <span>{{ applyLabel }}</span>
      </button>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import {
  ref,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
  useBlokkli,
} from '#imports'
import { Icon, FormToggle } from '#blokkli/editor/components'
import { onBlokkliEvent } from '#blokkli/editor/composables'
import { itemEntityType } from '#blokkli-build/config'
import type { EntityContext } from '#blokkli/types'
import type { ApprovalItem } from './index.vue'

const props = defineProps<{
  items: ApprovalItem[]
  selected: Record<number, boolean>
  reasons: Record<number, string>
  applyLabel: string
}>()

const emit = defineEmits<{
  (e: 'update:selected', id: number, value: boolean): void
  (e: 'update:reasons', id: number, value: string): void
  (e: 'apply'): void
}>()

const { ui, blocks, types, directive, eventBus, context, $t } = useBlokkli()

const currentIndex = ref(0)

const currentItem = computed(() => props.items[currentIndex.value]!)

const bundleLabel = computed(() => {
  const item = currentItem.value
  const block = blocks.getBlock(item.uuid)
  if (!block) return ''
  const def = types.getBlockBundleDefinition(block.bundle)
  return def?.label || block.bundle
})

function resolveHost(uuid: string): EntityContext | null {
  if (uuid === context.value.entityUuid) {
    return {
      type: context.value.entityType,
      bundle: context.value.entityBundle,
      uuid,
    }
  }
  const block = blocks.getBlock(uuid)
  if (!block) return null
  return { type: itemEntityType, bundle: block.bundle, uuid }
}

function locateItem(item: ApprovalItem) {
  const host = resolveHost(item.uuid)
  if (host) {
    const el = directive.findEditableElement(item.fieldName, host)
    if (el) {
      eventBus.emit('highlight', el)
      eventBus.emit('scrollIntoView', { element: el, immediate: true })
      return
    }
  }
  eventBus.emit('scrollIntoView', { uuid: item.uuid, immediate: true })
}

function prev() {
  currentIndex.value =
    (currentIndex.value - 1 + props.items.length) % props.items.length
}

function next() {
  currentIndex.value = (currentIndex.value + 1) % props.items.length
}

function toggleCurrent() {
  const item = currentItem.value
  emit('update:selected', item.id, !props.selected[item.id])
}

function onReasonInput(event: Event) {
  const value = (event.target as HTMLInputElement).value
  emit('update:reasons', currentItem.value.id, value)
}

watch(currentIndex, () => {
  const item = props.items[currentIndex.value]
  if (item) {
    locateItem(item)
  }
})

onBlokkliEvent('editable:focus', (e) => {
  const index = props.items.findIndex(
    (item) => item.fieldName === e.fieldName && item.uuid === e.uuid,
  )
  if (index !== -1) {
    currentIndex.value = index
  }
})

onMounted(() => {
  ui.setIsApproving(true)
})

onBeforeUnmount(() => {
  ui.setIsApproving(false)
})
</script>
