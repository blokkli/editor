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
      :class="{
        'bk-is-compact': list.length > 8,
      }"
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
    class="bk-vars"
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
import type { FieldListItem, EntityContext } from '#blokkli/types'
import type { BlokkliFragmentName } from '#blokkli-build/definitions'
import BlokkliItem from './../../components/BlokkliItem.vue?blokkliEditing=true'
import { isVisibleByOptions } from '#blokkli/helpers/runtimeHelpers'
import {
  INJECT_FIELD_PROXY_MODE,
  INJECT_IS_EDITING,
} from '#blokkli/helpers/injections'
import type {
  FieldListItemTyped,
  ValidFieldListTypes,
} from '#blokkli-build/generated-types'
import type { FieldDropAlignment } from '#blokkli/types/field'
import type { RegisterFieldData } from '../types/field'

const { dom, selection } = useBlokkli()

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
    zIndex?: number | string
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
    zIndex: 0,
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
      selection.isMultiSelecting.value ||
      selection.hasHostSelected.value),
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
  const zIndex = Number(props.zIndex)
  return {
    fieldListType: props.fieldListType,
    allowedFragments,
    isNested: props.isNested,
    nestingLevel: props.nestingLevel,
    dropAlignment: props.dropAlignment ?? null,
    zIndex: Number.isNaN(zIndex) ? 0 : zIndex,
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

<style lang="postcss">
.bk-vars.bk-draggable-list-container {
  .bk-list-item {
    @apply bg-white p-20 font-bold !rounded-none;
    &:after {
      @apply hidden;
    }
  }
  .bk-list-item-inner {
    @apply flex gap-20 h-full items-center;
  }
  .bk-list-item-icon {
    width: 2rem;
    height: 2rem;
  }
}

.bk.bk-field-list-proxy {
  @apply z-dialog w-full min-h-40 p-20 absolute;
  @apply w-full left-0 top-0;

  @apply transition-opacity duration-100;

  @apply opacity-0 pointer-events-none;

  html.bk-is-proxy-mode & {
    @apply opacity-100 pointer-events-auto static;
    @apply mx-10 max-w-full min-w-0 w-auto;

    .bk-block-proxy {
      @apply min-w-[200px];
    }
  }

  &.bk-is-visible {
    @apply opacity-100 pointer-events-auto;
  }

  &.bk-is-horizontal {
    > .bk-field-list-proxy-list {
      @apply flex gap-15 flex-wrap;
      &.bk-is-compact {
        @apply !gap-5;
        .bk-blokkli-item-icon {
          @apply hidden;
        }
        .bk-block-proxy {
          @apply p-5;
          .bk-block-proxy-component {
            @apply mt-2;
          }
        }
      }
    }
  }

  &.bk-is-vertical {
    > .bk-field-list-proxy-list {
      @apply grid gap-15;
    }
  }

  .bk-field-list-proxy {
    @apply p-0 relative h-auto w-auto bg-none z-auto !mx-0;
    .bk-block-proxy {
      @apply shadow-none;
    }
  }
}
</style>
