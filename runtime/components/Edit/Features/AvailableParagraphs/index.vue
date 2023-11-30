<template>
  <Teleport to="body">
    <div
      v-if="selectableParagraphTypes.length"
      @wheel.stop=""
      class="pb pb-available-paragraphs pb-control"
      :class="{ 'pb-is-active': isActive }"
      ref="wrapper"
      @wheel.prevent.capture="onWheel"
      @mouseenter="onMouseEnter"
      @mouseleave="onMouseLeave"
    >
      <div ref="typeList" class="pb-list" :style="style">
        <div
          class="pb-list-item pb-clone"
          data-element-type="new"
          :data-paragraph-type="type.id"
          v-for="(type, i) in sortedList"
          :class="{
            'pb-is-disabled':
              !type.id || !selectableParagraphTypes.includes(type.id),
          }"
          :key="i + (type.id || 'undefined') + updateKey"
        >
          <div class="pb-list-item-inner">
            <div class="pb-list-item-icon">
              <ParagraphIcon :bundle="type.id" />
            </div>
            <div class="pb-list-item-label">
              <span>{{ type.label }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { Sortable } from '#pb/sortable'
import { falsy, onlyUnique } from '#pb/helpers'
import { ParagraphIcon } from '#pb/components'
import { DraggableExistingParagraphItem } from '#pb/types'

const { eventBus, state, selection, storage, types, context } = useBlokkli()

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
  p: DraggableExistingParagraphItem,
): string[] => {
  // If the selected paragraph allows nested paragraphs, return the allowed paragraphs for it.
  if (types.paragraphTypesWithNested.value.includes(p.paragraphType)) {
    return types.allowedTypes.value
      .filter(
        (v) => v.entityType === 'paragraph' && v.bundle === p.paragraphType,
      )
      .flatMap((v) => v.allowedTypes)
      .filter(Boolean) as string[]
  }
  // If the selected paragraph is inside a nested paragraph, return the allowed paragraphs of the parent paragraph.
  if (p.hostType === 'paragraph') {
    return types.allowedTypes.value
      .filter((v) => v.entityType === 'paragraph' && v.bundle === p.hostBundle)
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

const selectableParagraphTypes = computed(() => {
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

  return generallyAvailableParagraphTypes.value.map((v) => v.id || '')
})

const generallyAvailableParagraphTypes = computed(() => {
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
    const sorted = [...typeList.value.querySelectorAll('.pb-list-item')]
      .map((v) => {
        return (v as HTMLDivElement).dataset.paragraphType
      })
      .filter(falsy)
      .filter(onlyUnique)
    sorts.value = sorted
  }
}

const sortedList = computed(() => {
  if (!generallyAvailableParagraphTypes.value) {
    return []
  }
  return [...generallyAvailableParagraphTypes.value]
    .filter((v) => v.id !== 'from_library')
    .sort((a, b) => {
      if (a.id && b.id) {
        return sorts.value.indexOf(a.id) - sorts.value.indexOf(b.id)
      }
      return 9999
    })
})

onMounted(() => {
  document.documentElement.classList.add('pb-has-sidebar-left')
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
  document.documentElement.classList.remove('pb-has-sidebar-left')
  if (instance) {
    instance.destroy()
  }
})
</script>
