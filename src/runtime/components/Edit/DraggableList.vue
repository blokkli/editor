<template>
  <div
    v-if="proxyMode || globalProxyMode"
    class="bk bk-field-list-proxy"
    :class="[
      {
        'bk-is-visible': proxyVisible,
      },
      'bk-is-' +
        (dropAlignment || (nestingLevel === 0 ? 'vertical' : 'horizontal')),
    ]"
  >
    <div
      ref="root"
      class="bk-field-list-proxy-list bk-draggable-list-container"
    >
      <BlokkliItem
        v-for="(item, i) in list"
        :key="item.uuid + fieldListType + definitions.renderKey.value + i"
        class="bk-field-list-item"
        :uuid="item.uuid"
        :bundle="item.bundle"
        :options="item.options"
        :props="item.props"
        is-editing
        :index="i"
        :data-bk-uuid="item.uuid"
        :parent-type="isNested ? entity.bundle : ''"
        :data-bk-is-muted="isMuted(item)"
      />
    </div>
  </div>
  <Component
    :is="tag"
    v-else
    ref="root"
    :class="['bk-draggable-list-container', attrs.class]"
  >
    <BlokkliItem
      v-for="(item, i) in list"
      :key="item.uuid + fieldListType"
      class="bk-field-list-item"
      :uuid="item.uuid"
      :bundle="item.bundle"
      :options="item.options"
      :props="item.props"
      is-editing
      :index="i"
      :parent-type="isNested ? entity.bundle : ''"
      :data-bk-uuid="item.uuid"
      :data-bk-is-muted="isMuted(item)"
    />
  </Component>
</template>

<script lang="ts" setup>
import {
  computed,
  useBlokkli,
  onMounted,
  onBeforeUnmount,
  useAttrs,
  provide,
  watch,
  useTemplateRef,
} from '#imports'
import type {
  FieldListItem,
  EntityContext,
  FieldDropAlignment,
  RegisterFieldData,
} from '#blokkli/types'
import type { BlokkliFragmentName } from '#blokkli-build/definitions'
import BlokkliItem from './../BlokkliItem.vue'
import { isVisibleByOptions } from '#blokkli/helpers/runtimeHelpers'
import {
  INJECT_FIELD_PROXY_MODE,
  INJECT_IS_EDITING,
} from '#blokkli/helpers/injections'
import type {
  FieldListItemTyped,
  ValidFieldListTypes,
} from '#blokkli-build/generated-types'

const { dom, selection, definitions } = useBlokkli()

const root = useTemplateRef('root')

const props = withDefaults(
  defineProps<{
    name: string
    fieldKey: string
    list: FieldListItem[]
    entity: EntityContext
    language?: string
    tag?: string
    isNested: boolean
    fieldListType: ValidFieldListTypes
    allowedFragments?: BlokkliFragmentName[] | BlokkliFragmentName
    dropAlignment?: FieldDropAlignment
    proxyMode?: boolean
    globalProxyMode?: boolean
    nestingLevel: number
    shouldRenderItem?: (item: FieldListItem | FieldListItemTyped) => boolean
  }>(),
  {
    tag: 'div',
    allowedFragments: () => {
      return []
    },
    dropAlignment: undefined,
    language: undefined,
    shouldRenderItem: undefined,
  },
)

const attrs = useAttrs()

provide(INJECT_FIELD_PROXY_MODE, props.proxyMode)
provide(INJECT_IS_EDITING, true)

const proxyVisible = computed(
  () =>
    props.proxyMode &&
    (selection.uuids.value.length ||
      selection.isDragging.value ||
      selection.isMultiSelecting.value),
)

// @TODO: This should be handled differently to prevent constant updates in the
// component when the options change.
// Ideally this is handled as an overlay on top of the blocks, similar to how
// selection or multi-select works.
function isMuted(item?: FieldListItem) {
  if (!item) {
    return true
  }

  if (!item.editContext?.isPublished) {
    return true
  }

  const isVisible = isVisibleByOptions(item, props.language)
  const isVisibleCustom = props.shouldRenderItem
    ? props.shouldRenderItem(item)
    : true

  return !(isVisible && isVisibleCustom)
}

const data = computed<RegisterFieldData>(() => {
  const allowedFragments = Array.isArray(props.allowedFragments)
    ? props.allowedFragments
    : [props.allowedFragments]
  return {
    fieldListType: props.fieldListType,
    allowedFragments,
    isNested: props.isNested,
    nestingLevel: props.nestingLevel,
    dropAlignment: props.dropAlignment ?? null,
  }
})

watch(
  () => root.value,
  function (newRoot) {
    if (newRoot instanceof HTMLElement) {
      dom.updateFieldElement(props.entity, props.name, newRoot, data.value)
    }
  },
)

onMounted(() => {
  if (root.value instanceof HTMLElement) {
    dom.registerField(props.entity, props.name, root.value, data.value)
  }
})

onBeforeUnmount(() => {
  dom.unregisterField(props.entity, props.name)
})

defineOptions({
  inheritAttrs: false,
})

if (import.meta.hot) {
  // This is needed to make HMR work.
  // The only thing imported is the "isVisibleByOptions", which is okay if
  // it doesn't update.
  import.meta.hot.accept('#blokkli/helpers/runtimeHelpers', () => {})
}
</script>
