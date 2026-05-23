<template>
  <div
    class="absolute top-0 left-0 rounded"
    :class="[
      selected
        ? 'border-lime-normal outline-lime-normal/30'
        : 'border-red-normal outline-red-normal/30',
      active
        ? 'border-4 outline-[5px] rounded-tl-none'
        : 'border hover:border-mono-500 hover:bg-mono-400/20',
    ]"
    :style="rect"
  >
    <button class="size-full block" @click.prevent="$emit('activate')" />
    <button
      v-show="active"
      class="absolute left-[-3px] bottom-full h-30 px-8 flex items-center justify-center gap-5 text-white rounded-t-md"
      :class="
        selected
          ? 'bg-lime-normal hover:bg-lime-dark'
          : 'bg-red-normal hover:bg-red-dark'
      "
      @click.prevent="$emit('toggle')"
    >
      <Icon
        :name="selected ? 'bk_mdi_check' : 'bk_mdi_close'"
        class="size-20 p-2 rounded flex items-center justify-center border border-white"
        :class="selected ? 'text-lime-normal bg-white' : 'text-white'"
      />
      <span
        class="text-xs font-semibold uppercase tracking-wider leading-none translate-y-1"
      >
        {{
          selected
            ? $t('aiAgentApprovalAccepted', 'Accepted')
            : $t('aiAgentApprovalRejected', 'Rejected')
        }}
      </span>
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
import { computeDiff, computeInsertion } from '#blokkli/editor/helpers/diff'

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
  /**
   * Render the new value entirely as an insertion instead of a diff.
   *
   * See the prop of the same name on DiffApproval.
   */
  insertionsOnly?: boolean
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
  props.insertionsOnly
    ? computeInsertion(props.value)
    : computeDiff(override.originalValue, props.value),
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
