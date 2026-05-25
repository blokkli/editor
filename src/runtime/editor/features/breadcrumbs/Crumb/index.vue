<template>
  <li
    class="flex items-center h-full text-base leading-none relative"
    :class="[
      canShrink ? 'shrink min-w-0' : 'shrink-0',
      isLast ? 'text-mono-50 pointer-events-none' : '',
    ]"
    :data-test="`breadcrumb-${testId ?? crumb?.type}`"
    :data-test-current="isLast"
    :data-test-uuid="crumb?.type === 'block' ? crumb.uuid : undefined"
    :data-test-field="crumb?.type === 'field' ? crumb.fieldName : undefined"
    :data-test-count="crumb?.type === 'multiple' ? crumb.count : undefined"
  >
    <span v-if="!isFirst" class="text-mono-400 shrink-0">»</span>

    <template v-if="crumb">
      <button
        v-if="crumb.type === 'block'"
        type="button"
        class="group flex items-center h-full px-10 relative hover:text-white"
        :class="isLast ? 'font-bold text-white' : 'font-medium text-mono-300'"
        @click.prevent="onClickBlock"
      >
        <span
          class="whitespace-nowrap overflow-hidden text-ellipsis leading-[24px] group-hover:underline group-hover:underline-offset-4"
        >
          {{ crumb.label }}
        </span>
      </button>

      <span
        v-else-if="crumb.type === 'multiple'"
        class="flex items-center h-full px-10 relative"
        :class="isLast ? 'font-bold text-white' : 'text-mono-300'"
      >
        {{ crumb.count }} {{ $t('multipleItemsLabel', 'Items') }}
      </span>

      <button
        v-else-if="crumb.type === 'field'"
        type="button"
        class="group flex items-center h-full px-10 relative hover:text-white uppercase text-xs tracking-wide min-w-0"
        :class="isLast ? 'font-bold text-white' : 'font-medium text-mono-300'"
        @click.prevent="onClickField"
      >
        <span
          class="whitespace-nowrap overflow-hidden text-ellipsis px-[8px] pt-[4px] pb-2 border"
          :class="
            isLast
              ? 'bg-mono-600 text-white border-mono-200'
              : 'bg-mono-800 text-mono-300 border-mono-600 group-hover:bg-mono-700 group-hover:text-white group-hover:border-mono-500'
          "
        >
          {{ crumb.label }}
        </span>
      </button>
    </template>

    <!-- The one-off crumbs (artboard root, host, active field) are rendered by
         the parent — this shell only provides the separator + positioning. -->
    <slot v-else />
  </li>
</template>

<script lang="ts" setup>
import { computed, useBlokkli } from '#imports'
import type { Crumb } from '../types'

const props = defineProps<{
  /** A data crumb to render; omit and use the slot for one-off crumbs. */
  crumb?: Crumb
  /** The first crumb (the root) has no leading separator. */
  isFirst?: boolean
  isLast: boolean
  /** Whether this crumb may shrink with an ellipsis (field crumbs always do). */
  shrinkable?: boolean
  /** Test identity for slot crumbs (root/host/editable); data crumbs use their type. */
  testId?: string
}>()

const { $t, state, eventBus } = useBlokkli()

// Field crumbs (and any caller-flagged crumb, e.g. the host) shrink with an
// ellipsis — except the last (current) crumb, which stays at full width.
const canShrink = computed(
  () => (props.shrinkable || props.crumb?.type === 'field') && !props.isLast,
)

function onClickBlock() {
  if (props.crumb?.type !== 'block') {
    return
  }
  eventBus.emit('select', props.crumb.uuid)
  eventBus.emit('scrollIntoView', { uuid: props.crumb.uuid })
}

function onClickField() {
  if (props.crumb?.type !== 'field') {
    return
  }
  const field = state.getMutatedField(
    props.crumb.entityUuid,
    props.crumb.fieldName,
  )
  if (!field || !field.list.length) {
    return
  }

  eventBus.emit(
    'select',
    field.list.map((item) => item.uuid),
  )
}
</script>

<script lang="ts">
export default {
  name: 'BreadcrumbsCrumb',
}
</script>
