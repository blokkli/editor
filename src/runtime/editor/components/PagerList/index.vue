<template>
  <div ref="wrapper" data-test="pager-list">
    <!--
      No "bk" class: the list holds the project's markup, which the editor's
      styles under ".bk" would change.
    -->
    <FieldPager ref="band" :label :items="pages" :shown-index :selected-index>
      <template #page="page">
        <ShownPage v-if="page.isShown" v-bind="page" />
        <BlockPage v-else v-bind="page" />
      </template>
      <!-- Room for the add buttons' button: they draw it on the canvas. -->
      <template #end>
        <div
          v-if="canAdd && list.length"
          ref="addArea"
          class="ml-5 my-10 w-40"
          data-test="pager-add-area"
        />
      </template>
    </FieldPager>
    <!-- The field's slot renders the shown block (proxy-mode="slot"). -->
    <slot v-if="rendersSlot" :items="slotItems" :shown-index />
    <Component :is="tag" v-else-if="shownItem" ref="list" :class="listClass">
      <BlokkliItem
        :key="shownItem.uuid + fieldData.fieldListType"
        class="bk-field-list-item"
        :uuid="shownItem.uuid"
        :bundle="shownItem.bundle"
        :options="shownItem.options"
        :props="shownItem.props"
        is-editing
        :index="shownIndex"
        :parent-type="fieldData.isNested ? entity.bundle : ''"
        :data-bk-uuid="shownItem.uuid"
        :data-bk-is-muted="isMuted(shownItem)"
      />
    </Component>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  onMounted,
  provide,
  useBlokkli,
  useTemplateRef,
  watch,
} from '#imports'
import type { EntityContext, FieldListItem } from '#blokkli/types'
import type { VueClassProp } from '#blokkli/types/vue'
import type { FieldListItemTyped } from '#blokkli-build/generated-types'
import { fromLibraryBlockBundle } from '#blokkli-build/config'
import { onElementResize } from '#blokkli/editor/composables'
import { getFieldAddBundles } from '#blokkli/editor/helpers/dropTargets'
import { INJECT_PAGER_SLOT } from '#blokkli/helpers/injections'
import BlokkliItem from './../../../components/BlokkliItem.vue?blokkliEditing=true'
import FieldPager from '../FieldPager/index.vue'
import type { FieldPagerItem } from '../FieldPager/types'
import type { RegisterFieldData } from '../../types/field'
import BlockPage from './BlockPage/index.vue'
import ShownPage from './ShownPage/index.vue'
import SlotItem from './SlotItem/index.vue'

const props = withDefaults(
  defineProps<{
    name: string
    fieldKey: string
    list: FieldListItem[]
    entity: EntityContext
    tag?: string
    fieldData: RegisterFieldData
    listClass?: VueClassProp
    isMuted: (item?: FieldListItem) => boolean
    /**
     * Whether the field's slot renders the shown block (`proxy-mode="slot"`).
     * Read once.
     */
    rendersSlot?: boolean
  }>(),
  {
    tag: 'div',
    listClass: '',
    rendersSlot: false,
  },
)

defineSlots<{
  default(props: {
    items: FieldListItemTyped[]
    shownIndex: number | null
  }): any
}>()

const { dom, pager, types, state, fields, permissions, adapter } = useBlokkli()

const band = useTemplateRef('band')
const wrapper = useTemplateRef('wrapper')
const listElement = useTemplateRef('list')
const addArea = useTemplateRef<HTMLDivElement>('addArea')

const maxNestingLevel = adapter.getMaxNestingLevel?.()

const label = computed(
  () =>
    types.getFieldConfig(props.entity.type, props.entity.bundle, props.name)
      ?.label || props.name,
)

const childUuids = computed(() => props.list.map((item) => item.uuid))

const shownUuid = computed(() =>
  pager.getShown(props.fieldKey, childUuids.value),
)

const shownIndex = computed<number | null>(() => {
  const index = shownUuid.value ? childUuids.value.indexOf(shownUuid.value) : -1
  return index === -1 ? null : index
})

const shownItem = computed<FieldListItem | undefined>(() =>
  shownIndex.value === null ? undefined : props.list[shownIndex.value],
)

const selectedIndex = computed<number | null>(() =>
  shownUuid.value && pager.holdsSelection(shownUuid.value)
    ? shownIndex.value
    : null,
)

const pages = computed<FieldPagerItem[]>(() =>
  props.list.map((item) => ({
    uuid: item.uuid,
    bundle: getPageBundle(item),
    isMuted: props.isMuted(item),
  })),
)

/**
 * The type a page shows: a library item shows its block's, as its proxy does.
 */
function getPageBundle(item: FieldListItem): string {
  if (item.bundle === fromLibraryBlockBundle) {
    return item.props?.libraryItem?.block?.bundle || item.bundle
  }
  return item.bundle
}

/**
 * The slot's items: with the props being edited, as a block's component gets
 * them (BlokkliItem). An inline edit of a field that the type maps to a prop
 * writes there too.
 */
const slotItems = computed<FieldListItemTyped[]>(
  () =>
    props.list.map((item) => {
      const mutated = state.mutatedItemProps[item.uuid]
      return mutated ? { ...item, props: { ...item.props, ...mutated } } : item
    }) as FieldListItemTyped[],
)

if (props.rendersSlot) {
  // Which <BlokkliItem> is the shown block's element: the first one set up.
  const claims = new Map<string, number>()

  provide(INJECT_PAGER_SLOT, {
    uuids: childUuids,
    shownUuid,
    isMuted: (uuid) =>
      props.isMuted(props.list.find((item) => item.uuid === uuid)),
    claim: (uuid, key) => {
      const current = claims.get(uuid)
      if (current !== undefined && current !== key) {
        return false
      }
      claims.set(uuid, key)
      return true
    },
    release: (uuid, key) => {
      if (claims.get(uuid) === key) {
        claims.delete(uuid)
      }
    },
    component: SlotItem,
  })
}

onMounted(() => {
  const element = band.value?.list
  if (element instanceof HTMLElement) {
    dom.registerField(props.entity, props.name, element, {
      ...props.fieldData,
      // The pages are always a row.
      dropAlignment: null,
      isPager: true,
    })
  }
})

onBeforeUnmount(() => {
  dom.unregisterField(props.entity, props.name)
})

/**
 * Whether the user may add a block at the end of the field. The add buttons
 * then offer it in the band, whatever is selected.
 */
const canAdd = computed(() => {
  if (state.editMode.value !== 'editing') {
    return false
  }
  const field = fields.find(props.entity.uuid, props.name)
  return (
    !!field &&
    getFieldAddBundles(field, props.list.length, {
      canChange: permissions.canChangeField(props.entity, props.name),
      maxNestingLevel,
      isBundlePermitted: (bundle) =>
        permissions.checkBlockBundlePermission(bundle, 'add'),
    }).length > 0
  )
})

/**
 * Where the add buttons draw their button: the room after the pages, or the
 * empty list of pages.
 */
const addAreaElement = computed<HTMLElement | null>(() => {
  if (!canAdd.value) {
    return null
  }
  if (props.list.length) {
    return addArea.value
  }
  const element = band.value?.list
  return element instanceof HTMLElement ? element : null
})

watch(
  addAreaElement,
  (element, previous) => {
    if (previous) {
      dom.unregisterAddArea(props.fieldKey, previous)
    }
    if (element) {
      dom.registerAddArea(props.fieldKey, element)
    }
  },
  { flush: 'post' },
)

onBeforeUnmount(() => {
  if (addAreaElement.value) {
    dom.unregisterAddArea(props.fieldKey, addAreaElement.value)
  }
})

// Showing another block, its component loading late or an edit change the
// height of the list, and everything below it moves. Nothing else measures
// the blocks again then: their positions only change when they cross the
// margin of the intersection observer. With the slot, its markup is the
// wrapper's.
let refreshFrame: number | null = null

onElementResize(props.rendersSlot ? wrapper : listElement, () => {
  if (refreshFrame !== null) {
    return
  }
  refreshFrame = window.requestAnimationFrame(() => {
    refreshFrame = null
    dom.updateVisibleRects()
  })
})

onBeforeUnmount(() => {
  if (refreshFrame !== null) {
    window.cancelAnimationFrame(refreshFrame)
  }
})

// A slot that doesn't render the shown block as a <BlokkliItem>: the block has
// no element, so no outline, no inline editing, and navigation to it gives up.
// Checked a second after the registrations settle, which is navigation's bound
// too, since the project's own components may come late.
if (import.meta.dev && props.rendersSlot) {
  const warned = new Set<string>()
  let checkTimeout: number | null = null

  const checkShownBlock = () => {
    checkTimeout = null
    const uuid = shownUuid.value
    if (!uuid || warned.has(uuid)) {
      return
    }
    // The element, or the root of a type's component whose element is inside
    // (blokkliDraggable).
    const element = dom.registeredBlocks.value[uuid]
    if (element?.closest(`[data-bk-uuid="${uuid}"]`)) {
      return
    }
    warned.add(uuid)
    console.warn(
      `[blökkli] The slot of the field "${props.name}" (proxy-mode="slot") ` +
        `doesn't render its shown block ${uuid} as a <BlokkliItem>, or its ` +
        'first node is neither an element nor a component with one root. ' +
        `Render what the slot can't show as <BlokkliItem v-bind="item" />.`,
    )
  }

  watch(
    () => [dom.settleKey.value, shownUuid.value],
    () => {
      if (checkTimeout !== null) {
        window.clearTimeout(checkTimeout)
      }
      checkTimeout = window.setTimeout(checkShownBlock, 1000)
    },
    { immediate: true },
  )

  onBeforeUnmount(() => {
    if (checkTimeout !== null) {
      window.clearTimeout(checkTimeout)
    }
  })
}
</script>
