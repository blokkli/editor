<template>
  <div
    class="bk-approval-highlight-item"
    :class="{
      'bk-is-active': active,
      'bk-is-approved': selected,
      'bk-is-rejected': !selected,
    }"
    :style="rect"
  >
    <button
      class="bk-approval-highlight-item-area"
      @click.prevent="$emit('activate')"
    />
    <button
      v-show="active"
      class="bk-approval-highlight-item-badge"
      @click.prevent="$emit('toggle')"
    >
      <Icon :name="selected ? 'bk_mdi_check' : 'bk_mdi_close'" />
      <span>{{
        selected
          ? $t('aiAgentApprovalAccepted', 'Accepted')
          : $t('aiAgentApprovalRejected', 'Rejected')
      }}</span>
    </button>
  </div>
</template>

<script lang="ts" setup>
import { watch, ref, computed, useBlokkli } from '#imports'
import {
  useEditableFieldOverride,
  onBlokkliEvent,
} from '#blokkli/editor/composables'
import { Icon } from '#blokkli/editor/components'
import { itemEntityType } from '#blokkli-build/config'
import type { EntityContext } from '#blokkli/types'
import { computeDiff } from '#blokkli/editor/helpers/diff'

type ItemRect = {
  width: string
  height: string
  transform: string
  visibility?: 'hidden' | 'visible'
}

const props = defineProps<{
  uuid: string
  fieldName: string
  value: string
  selected: boolean
  active: boolean
}>()

defineEmits<{
  (e: 'activate' | 'toggle'): void
}>()

const { ui, blocks, context, $t } = useBlokkli()

function resolveHost(): EntityContext {
  if (props.uuid === context.value.entityUuid) {
    return {
      type: context.value.entityType,
      bundle: context.value.entityBundle,
      uuid: props.uuid,
    }
  }
  const block = blocks.getBlock(props.uuid)
  return {
    type: itemEntityType,
    bundle: block?.bundle || '',
    uuid: props.uuid,
  }
}

const host = resolveHost()
const override = useEditableFieldOverride(props.fieldName, host)

const diffHtml = computed(() =>
  computeDiff(override.originalValue, props.value),
)

function applyOverride() {
  if (props.selected) {
    override.setDiffHtml(diffHtml.value)
  } else {
    override.restore()
  }
}

// Apply preview immediately.
applyOverride()

// Toggle preview when selection changes.
watch(
  () => props.selected,
  () => applyOverride(),
)

const rect = ref<ItemRect>({ width: '0', height: '0', transform: '' })

function updateRect() {
  const el = override.element
  if (el) {
    const r = ui.getAbsoluteElementRect(el)
    const pad = 5
    rect.value = {
      width: r.width + pad * 2 + 'px',
      height: r.height + pad * 2 + 'px',
      transform: `translate(${r.x - pad}px, ${r.y - pad}px)`,
    }
  } else {
    rect.value = {
      width: '0',
      height: '0',
      transform: '',
      visibility: 'hidden',
    }
  }
}

let lastFullUpdate = 0

onBlokkliEvent('animationFrame', (ctx) => {
  const forceRefresh = ctx.time - lastFullUpdate > 1000
  if (!forceRefresh) return
  lastFullUpdate = ctx.time
  updateRect()
})

defineExpose({ updateRect })
</script>
