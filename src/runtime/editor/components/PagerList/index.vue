<template>
  <div data-test="pager-list">
    <!--
      No "bk" class: the list holds the project's markup, which the editor's
      styles under ".bk" would change.
    -->
    <FieldPager ref="band" :label :items="pages" :shown-index :selected-index>
      <template #page="page">
        <ShownPage v-if="page.isShown" v-bind="page" />
        <BlockPage v-else v-bind="page" />
      </template>
    </FieldPager>
    <Component :is="tag" v-if="shownItem" ref="list" :class="listClass">
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
  useBlokkli,
  useTemplateRef,
} from '#imports'
import type { EntityContext, FieldListItem } from '#blokkli/types'
import type { VueClassProp } from '#blokkli/types/vue'
import { fromLibraryBlockBundle } from '#blokkli-build/config'
import { onElementResize } from '#blokkli/editor/composables'
import BlokkliItem from './../../../components/BlokkliItem.vue?blokkliEditing=true'
import FieldPager from '../FieldPager/index.vue'
import type { FieldPagerItem } from '../FieldPager/types'
import type { RegisterFieldData } from '../../types/field'
import BlockPage from './BlockPage/index.vue'
import ShownPage from './ShownPage/index.vue'

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
  }>(),
  {
    tag: 'div',
    listClass: '',
  },
)

const { dom, pager, types } = useBlokkli()

const band = useTemplateRef('band')
const listElement = useTemplateRef('list')

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

// Showing another block, its component loading late or an edit change the
// height of the list, and everything below it moves. Nothing else measures
// the blocks again then: their positions only change when they cross the
// margin of the intersection observer.
let refreshFrame: number | null = null

onElementResize(listElement, () => {
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
</script>
