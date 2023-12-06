<template>
  <Teleport to="body">
    <div
      v-if="selectableBundles.length"
      class="bk bk-add-list bk-control"
      :class="[{ 'bk-is-active': isActive }, 'bk-is-' + listOrientation]"
      ref="wrapper"
      @wheel.prevent.capture.stop="onWheel"
      @mouseenter="onMouseEnter"
      @mouseleave="onMouseLeave"
    >
      <div ref="typeList" class="bk-list" :style="style">
        <div
          class="bk-list-item bk-clone"
          data-element-type="new"
          :data-item-bundle="type.id"
          v-for="(type, i) in sortedList"
          :class="{
            'bk-is-disabled': !type.id || !selectableBundles.includes(type.id),
          }"
          :key="i + (type.id || 'undefined') + updateKey"
        >
          <div class="bk-list-item-inner">
            <div class="bk-list-item-icon">
              <ItemIcon :bundle="type.id" />
            </div>
            <div
              class="bk-list-item-label"
              :class="{ 'bk-tooltip': listOrientation === 'horizontal' }"
            >
              <span>{{ type.label }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { Sortable } from '#blokkli/sortable'
import { falsy, onlyUnique } from '#blokkli/helpers'
import { ItemIcon } from '#blokkli/components'
import { DraggableExistingBlokkliItem } from '#blokkli/types'

const { eventBus, state, selection, storage, types, context, runtimeConfig } =
  useBlokkli()

const itemEntityType = runtimeConfig.itemEntityType

const listOrientation = storage.use<'horizontal' | 'vertical'>(
  'listOrientation',
  'vertical',
)

watch(listOrientation, setRootClasses)

const typeList = ref<HTMLDivElement | null>(null)
const wrapper = ref<HTMLDivElement | null>(null)
const isDragging = ref(false)
const isActive = ref(false)
const updateKey = ref(0)
const scrollY = ref(0)

const sorts = storage.use<string[]>('sorts', [])

let instance: Sortable | null = null
let mouseTimeout: any = null

const activeField = computed(() => {
  if (selection.activeFieldKey.value) {
    const el = document.querySelector(
      `[data-field-key="${selection.activeFieldKey.value}"]`,
    )
    if (el && el instanceof HTMLElement) {
      const label = el.dataset.fieldLabel
      const name = el.dataset.fieldName
      const isNested = el.dataset.fieldIsNested === 'true'
      const hostEntityType = el.dataset.hostEntityType
      const hostEntityUuid = el.dataset.hostEntityUuid
      if (label && name && hostEntityType && hostEntityUuid) {
        return { label, name, hostEntityType, hostEntityUuid, isNested }
      }
    }
  }
})

const getAllowedTypesForSelected = (
  p: DraggableExistingBlokkliItem,
): string[] => {
  // If the selected bundle allows nested items, return the allowed bundles for it instead.
  if (types.itemBundlesWithNested.value.includes(p.itemBundle)) {
    return types.allowedTypes.value
      .filter(
        (v) => v.entityType === itemEntityType && v.bundle === p.itemBundle,
      )
      .flatMap((v) => v.allowedTypes)
      .filter(Boolean) as string[]
  }
  // If the selected bundle is inside a nested item, return the allowed bundles of the parent bundle.
  if (p.hostType === itemEntityType) {
    return types.allowedTypes.value
      .filter(
        (v) => v.entityType === itemEntityType && v.bundle === p.hostBundle,
      )
      .flatMap((v) => v.allowedTypes)
      .filter(Boolean) as string[]
  } else {
    return types.allowedTypes.value
      .filter(
        (v) =>
          v.entityType === context.value.entityType &&
          v.bundle === context.value.entityBundle &&
          v.fieldName === p.hostFieldName,
      )
      .flatMap((v) => v.allowedTypes)
      .filter(Boolean) as string[]
  }
}

const selectableBundles = computed(() => {
  if (selection.blocks.value.length) {
    return selection.blocks.value.flatMap((v) => getAllowedTypesForSelected(v))
  }
  if (
    activeField.value &&
    activeField.value.hostEntityType === context.value.entityType
  ) {
    return (
      types.allowedTypes.value.find((v) => {
        return (
          v.bundle === context.value.entityBundle &&
          v.fieldName === activeField.value?.name
        )
      })?.allowedTypes || []
    )
  }

  return generallyAvailableBundles.value.map((v) => v.id || '')
})

const generallyAvailableBundles = computed(() => {
  const fieldNames = state.mutatedFields.value.map((v) => v.name)
  const typesOnEntity = (
    types.allowedTypes.value.filter((v) => {
      return (
        v.entityType === context.value.entityType &&
        v.bundle === context.value.entityBundle &&
        fieldNames.includes(v.fieldName)
      )
    }) || []
  )
    .flatMap((v) => v.allowedTypes)
    .filter(Boolean)

  const typesOnParagraphs =
    types.allowedTypes.value
      .filter((v) => {
        return typesOnEntity.includes(v.bundle)
      })
      .flatMap((v) => v.allowedTypes) || []

  const allAllowedTypes = [...typesOnEntity, ...typesOnParagraphs]

  return (
    types.allTypes.value.filter(
      (v) => v.id && allAllowedTypes.includes(v.id),
    ) || []
  )
})

function onWheel(e: WheelEvent) {
  const scrollHeight = typeList.value?.scrollHeight || 0
  const wrapperHeight = wrapper.value?.offsetHeight || 0
  const diff = Math.min(Math.max(e.deltaY, -20), 20)
  scrollY.value = Math.min(
    Math.max(scrollY.value + diff, 0),
    scrollHeight - wrapperHeight,
  )
}

function onMouseEnter() {
  clearTimeout(mouseTimeout)
  mouseTimeout = setTimeout(() => {
    isActive.value = true
  }, 200)
}
function onMouseLeave() {
  clearTimeout(mouseTimeout)
  isActive.value = false
}

const style = computed(() => {
  return {
    transform: `translateY(-${scrollY.value}px)`,
  }
})

function storeSort() {
  if (typeList.value) {
    const sorted = [...typeList.value.querySelectorAll('.bk-list-item')]
      .map((v) => {
        return (v as HTMLDivElement).dataset.itemBundle
      })
      .filter(falsy)
      .filter(onlyUnique)
    sorts.value = sorted
  }
}

const sortedList = computed(() => {
  if (!generallyAvailableBundles.value) {
    return []
  }
  return [...generallyAvailableBundles.value]
    .filter((v) => v.id !== 'from_library')
    .sort((a, b) => {
      if (a.id && b.id) {
        return sorts.value.indexOf(a.id) - sorts.value.indexOf(b.id)
      }
      return 9999
    })
})

function setRootClasses() {
  document.documentElement.classList.remove('bk-has-sidebar-bottom')
  document.documentElement.classList.remove('bk-has-sidebar-left')

  if (listOrientation.value === 'horizontal') {
    document.documentElement.classList.add('bk-has-sidebar-bottom')
  } else if (listOrientation.value === 'vertical') {
    document.documentElement.classList.add('bk-has-sidebar-left')
  }
}

onMounted(() => {
  setRootClasses()
  if (typeList.value) {
    instance = new Sortable(typeList.value, {
      sort: true,
      group: {
        name: 'types',
        put: false,
        pull: 'clone',
        revertClone: false,
      },
      fallbackClass: 'sortable-fallback',
      onStart(e) {
        const rect = e.item.getBoundingClientRect()
        const originalEvent = (e as any).originalEvent || ({} as PointerEvent)
        eventBus.emit('dragging:start', {
          rect,
          offsetX: originalEvent.clientX,
          offsetY: originalEvent.clientY,
        })
        isDragging.value = true
      },
      onEnd() {
        eventBus.emit('dragging:end')
        isDragging.value = false
        storeSort()
        updateKey.value = updateKey.value + 1
        if (typeList.value) {
          typeList.value
            .querySelectorAll('[draggable="false"]')
            .forEach((el) => el.remove())
        }
      },
      forceFallback: true,
      animation: 300,
    })
  }
})
onUnmounted(() => {
  document.documentElement.classList.remove('bk-has-sidebar-bottom')
  document.documentElement.classList.remove('bk-has-sidebar-left')
  if (instance) {
    instance.destroy()
  }
})
</script>
