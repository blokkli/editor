<template>
  <Teleport
    v-if="state.canEdit.value && state.editMode.value === 'editing'"
    to="body"
  >
    <div
      v-if="selectableBundles.length"
      v-show="!ui.isMobile.value || !selection.isMultiSelecting.value"
      ref="wrapper"
      class="bk bk-add-list bk-control"
      :class="[{ 'bk-is-active': isActive }, 'bk-is-' + listOrientation]"
      @wheel.capture.stop="onWheel"
      @mouseenter="onMouseEnter"
      @mouseleave="onMouseLeave"
    >
      <Sortli ref="typeList" class="bk-list" :style="style">
        <button
          v-for="(type, i) in sortedList"
          :key="i + (type.id || 'undefined') + updateKey"
          class="bk-list-item bk-clone"
          data-element-type="new"
          :data-item-bundle="type.id"
          :data-sortli-id="type.id"
          :class="{
            'bk-is-disabled': !type.id || !selectableBundles.includes(type.id),
          }"
        >
          <div class="bk-list-item-inner">
            <div class="bk-list-item-icon">
              <ItemIcon :bundle="type.id" />
              <div class="bk-add-list-drop bk-drop-element">
                <ItemIcon :bundle="type.id" />
                <span>{{ type.label }}</span>
              </div>
            </div>
            <div
              class="bk-list-item-label"
              :class="{
                'bk-tooltip':
                  listOrientation === 'horizontal' && !ui.isMobile.value,
              }"
            >
              <span>{{ type.label }}</span>
            </div>
          </div>
        </button>
      </Sortli>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import {
  watch,
  ref,
  computed,
  useBlokkli,
  onMounted,
  onUnmounted,
} from '#imports'

import { falsy, onlyUnique } from '#blokkli/helpers'
import { ItemIcon, Sortli } from '#blokkli/components'
import type { DraggableExistingBlokkliItem } from '#blokkli/types'

const { state, selection, storage, types, context, runtimeConfig, ui } =
  useBlokkli()

const itemEntityType = runtimeConfig.itemEntityType

type ListOrientation = 'horizontal' | 'vertical'

const listOrientationSetting = storage.use<ListOrientation>(
  'listOrientation',
  'vertical',
)

const listOrientation = computed<ListOrientation>(() =>
  ui.isMobile.value ? 'horizontal' : listOrientationSetting.value,
)

watch(listOrientation, setRootClasses)

const typeList = ref<HTMLDivElement | null>(null)
const wrapper = ref<HTMLDivElement | null>(null)
const isActive = ref(false)
const updateKey = ref(0)
const scrollX = ref(0)
const scrollY = ref(0)

const sorts = storage.use<string[]>('sorts', [])

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
  const typesOnEntity = (
    types.allowedTypes.value.filter((v) => {
      return (
        v.entityType === context.value.entityType &&
        v.bundle === context.value.entityBundle
      )
    }) || []
  )
    .flatMap((v) => v.allowedTypes)
    .filter(Boolean)

  const typesOnItems =
    types.allowedTypes.value
      .filter((v) => {
        return typesOnEntity.includes(v.bundle)
      })
      .flatMap((v) => v.allowedTypes) || []

  const allAllowedTypes = [...typesOnEntity, ...typesOnItems]

  return (
    types.allTypes.value.filter(
      (v) => v.id && allAllowedTypes.includes(v.id),
    ) || []
  )
})

function onWheel(e: WheelEvent) {
  if (ui.isMobile.value) {
    return
  }
  e.preventDefault()
  if (listOrientation.value === 'vertical') {
    const scrollHeight = typeList.value?.scrollHeight || 0
    const wrapperHeight = wrapper.value?.offsetHeight || 0
    const diff = Math.min(Math.max(e.deltaY, -20), 20)
    if (wrapperHeight > scrollHeight) {
      scrollY.value = 0
    } else {
      scrollY.value = Math.min(
        Math.max(scrollY.value + diff, 0),
        scrollHeight - wrapperHeight,
      )
    }
  } else if (listOrientation.value === 'horizontal') {
    const scrollWidth = typeList.value?.scrollWidth || 0
    const wrapperWidth = wrapper.value?.offsetWidth || 0
    const diff = Math.min(Math.max(e.deltaY || e.deltaX, -20), 20)
    if (wrapperWidth > scrollWidth) {
      scrollX.value = 0
    } else {
      scrollX.value = Math.min(
        Math.max(scrollX.value + diff, 0),
        scrollWidth - wrapperWidth,
      )
    }
  }
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
    transform:
      listOrientation.value === 'vertical'
        ? `translateY(-${scrollY.value}px)`
        : `translateX(-${scrollX.value}px)`,
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
})
onUnmounted(() => {
  document.documentElement.classList.remove('bk-has-sidebar-bottom')
  document.documentElement.classList.remove('bk-has-sidebar-left')
})
</script>

<script lang="ts">
export default {
  name: 'AddList',
}
</script>
