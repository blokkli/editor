<template>
  <ToolCard icon="bk_mdi_edit" :title="title" @cancel="$emit('cancel')">
    <div v-if="!applying">
      <div class="bk-batch-rewrite-list" @mouseleave="onMouseLeave">
        <div v-for="item in items" :key="item.id">
          <ItemComponent
            v-model:selected="selected[item.id]"
            v-model:reason="reasons[item.id]"
            :uuid="item.uuid"
            :field-name="item.fieldName"
            :field-label="item.fieldLabel"
            :new-value="item.value"
          />
          <slot name="item-footer" :item="item" />
        </div>
      </div>
    </div>

    <template #actions>
      <button
        class="bk-button bk-is-small bk-is-lime bk-is-fullwidth"
        @click="onApply"
      >
        <Icon name="bk_mdi_check" />
        <span>{{ applyLabel }}</span>
      </button>
    </template>
  </ToolCard>

  <Toolbar
    v-if="items.length > 0"
    :items="items"
    :selected="selected"
    :reasons="reasons"
    :apply-label="applyLabel"
    @update:selected="onUpdateSelected"
    @update:reasons="onUpdateReasons"
    @apply="onApply"
  />
</template>

<script lang="ts" setup>
import { computed, reactive, useBlokkli } from '#imports'
import { Icon } from '#blokkli/editor/components'
import ToolCard from '../../features/agent/Panel/ToolCard/index.vue'
import ItemComponent from '../update_text_fields/Item.vue'
import Toolbar from './Toolbar.vue'

export type ApprovalItem = {
  id: number
  uuid: string
  fieldName: string
  fieldLabel: string
  value: string
}

const props = defineProps<{
  items: ApprovalItem[]
  title: string
  applying?: boolean
}>()

const emit = defineEmits<{
  (
    e: 'apply',
    data: {
      selected: Record<number, boolean>
      reasons: Record<number, string>
    },
  ): void
  (e: 'cancel'): void
}>()

const { $t, eventBus } = useBlokkli()

const selected = reactive<Record<number, boolean>>(
  Object.fromEntries(props.items.map((item) => [item.id, true])),
)
const reasons = reactive<Record<number, string>>(
  Object.fromEntries(props.items.map((item) => [item.id, ''])),
)

const selectedCount = computed(
  () => props.items.filter((item) => selected[item.id]).length,
)

const applyLabel = computed(() => {
  return $t('aiAgentBatchRewriteApply', 'Apply @count of @total')
    .replace('@count', selectedCount.value.toString())
    .replace('@total', props.items.length.toString())
})

function onMouseLeave() {
  eventBus.emit('highlight', null)
}

function onUpdateSelected(id: number, value: boolean) {
  selected[id] = value
}

function onUpdateReasons(id: number, value: string) {
  reasons[id] = value
}

function onApply() {
  emit('apply', {
    selected: { ...selected },
    reasons: { ...reasons },
  })
}
</script>
