<template>
  <div ref="el" class="bk-structure-field" :data-structure-field-key="key">
    <button
      v-if="totalFieldsOfType > 1"
      class="bk-structure-field-label"
      @click.prevent.stop.capture="onClickFieldLabel"
    >
      {{ config?.label || name }}
    </button>
    <div class="bk-structure-field-items">
      <div
        v-for="(item, index) in list"
        :key="item.uuid"
        class="bk-structure-field-item"
      >
        <div
          v-if="
            index === 0 && showTargets && !selection.isBlockSelected(item.uuid)
          "
          :style="targetStyle"
          class="bk-structure-field-target bk-is-before"
          @pointerup.stop.capture="onMouseUp()"
        />
        <Item
          :uuid="item.uuid"
          :bundle="item.bundle"
          :level="level"
          :visible-field-keys="visibleFieldKeys"
          :is-selected-from-parent="isSelectedFromParent"
          :is-visible="isVisible"
        />
        <div
          v-if="
            showTargets &&
            (!selection.isDraggingExisting.value ||
              !selection.isBlockSelected(item.uuid)) &&
            (!list[index + 1] ||
              !selection.isDraggingExisting.value ||
              !selection.isBlockSelected(list[index + 1].uuid))
          "
          :style="targetStyle"
          class="bk-structure-field-target bk-is-after"
          @pointerup.stop.capture="onMouseUp(item.uuid)"
        />
      </div>
      <div
        v-if="!list.length && showTargets"
        class="bk-structure-field-target bk-is-after"
        :style="targetStyle"
        @pointerup.stop.capture="onMouseUp()"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import {
  ref,
  useBlokkli,
  computed,
  inject,
  onMounted,
  onBeforeUnmount,
  nextTick,
} from '#imports'
import Item from './../Item/index.vue'

const props = withDefaults(
  defineProps<{
    name: string
    entityUuid: string
    entityType: string
    entityBundle: string
    allowedBundles: string[]
    cardinality: number
    level?: number
    visibleFieldKeys: Record<string, boolean>
    isSelectedFromParent?: boolean
  }>(),
  {
    level: 0,
  },
)

const targetStyle = computed(() => {
  return {
    zIndex: 50 + props.level,
  }
})

const { types, state, selection, dom, eventBus } = useBlokkli()

const mutatedField = computed(() =>
  state.getMutatedField(props.entityUuid, props.name),
)

const list = computed(() => mutatedField.value?.list || [])
const key = computed(() => props.entityUuid + ':' + props.name)

function onMouseUp(preceedingUuid?: string) {
  const field = dom.findField(props.entityUuid, props.name)

  if (!field) {
    return
  }

  eventBus.emit('dragging:drop', {
    field,
    preceedingUuid,
    items: selection.dragItems.value,
    host: {
      type: field.hostEntityType,
      uuid: field.hostEntityUuid,
      fieldName: field.name,
    },
  })

  const uuid = selection.uuids.value[0]
  if (uuid) {
    nextTick(() => {
      eventBus.emit('scrollIntoView', { uuid, center: true })
    })
  }
}

function onClickFieldLabel() {
  eventBus.emit(
    'select',
    list.value.map((v) => v.uuid),
  )
}

const el = ref<HTMLDivElement | null>(null)

const observer = inject<IntersectionObserver>('bk_structure_observer')

const isVisible = computed(() => !!props.visibleFieldKeys[key.value])

const bundlesAllowed = computed(() =>
  selection.dragItemsBundles.value.every((bundle) =>
    props.allowedBundles.includes(bundle),
  ),
)

const showTargets = computed(
  () =>
    selection.isDragging.value &&
    isVisible.value &&
    !props.isSelectedFromParent &&
    (props.cardinality === -1 || list.value.length < props.cardinality) &&
    bundlesAllowed.value,
)

const config = computed(() =>
  types.getFieldConfig(props.entityType, props.entityBundle, props.name),
)

const totalFieldsOfType = computed(
  () =>
    types.fieldConfig.forEntityTypeAndBundle(
      props.entityType,
      props.entityBundle,
    ).length,
)

onMounted(() => {
  if (el.value && observer) {
    observer.observe(el.value)
  }
})

onBeforeUnmount(() => {
  if (el.value && observer) {
    observer.unobserve(el.value)
  }
})

defineOptions({
  name: 'StructureListField',
})
</script>
