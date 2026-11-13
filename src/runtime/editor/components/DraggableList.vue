<template>
  <!-- The Structure view: every block as a proxy. -->
  <div
    v-if="globalProxyMode"
    class="bk bk-field-list-proxy"
    :class="
      'bk-is-' +
      (dropAlignment || (nestingLevel === 0 ? 'vertical' : 'horizontal'))
    "
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
  <PagerList
    v-else-if="proxyMode"
    :class="attrs.class"
    :name
    :field-key
    :list
    :entity
    :tag
    :field-data="data"
    :list-class
    :is-muted
    :renders-slot="proxyMode === 'slot'"
  >
    <template v-if="proxyMode === 'slot'" #default="slotProps">
      <slot v-bind="slotProps" />
    </template>
  </PagerList>
  <Component
    :is="tag"
    v-else
    ref="root"
    class="bk-vars"
    :class="[
      'bk-draggable-list-container',
      attrs.class,
      { 'bk-is-empty': !list.length },
    ]"
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
import { INJECT_IS_EDITING } from '#blokkli/helpers/injections'
import type {
  FieldListItemTyped,
  ValidFieldListTypes,
} from '#blokkli-build/generated-types'
import type { FieldDropAlignment } from '#blokkli/types/field'
import type { VueClassProp } from '#blokkli/types/vue'
import type { RegisterFieldData } from '../types/field'
import PagerList from './PagerList/index.vue'

const { dom } = useBlokkli()

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
    /** `'slot'`: the field's slot renders the shown block (PagerList). */
    proxyMode?: boolean | 'slot'
    globalProxyMode?: boolean
    nestingLevel: number
    listClass?: VueClassProp
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
    proxyMode: false,
    shouldRenderItem: undefined,
    listClass: '',
  },
)

const attrs = useAttrs()

defineSlots<{
  /** The field's slot, for a field in proxy mode that renders the shown block. */
  default(props: {
    items: FieldListItemTyped[]
    shownIndex: number | null
  }): any
}>()

provide(INJECT_IS_EDITING, true)

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
    isPager: false,
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

/*
 * An empty field gets room and a faint outline in the editor, even when the
 * site gives it no height, so there is always a place to add a block. Through
 * a pseudo element instead of min-height: the editor's CSS isn't in a cascade
 * layer, so a min-height here would override a larger one of the site.
 */
.bk-vars.bk-draggable-list-container.bk-is-empty {
  @apply outline-dashed outline-1 outline-accent-400/40 -outline-offset-1;

  &::before {
    content: '';
    @apply block h-[48px] pointer-events-none;
  }
}

.bk.bk-field-list-proxy {
  @apply min-h-40 p-20 mx-10 max-w-full min-w-0 pointer-events-auto;

  .bk-block-proxy {
    @apply min-w-[200px];
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
