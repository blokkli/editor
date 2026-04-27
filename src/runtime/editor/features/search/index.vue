<template>
  <Teleport :to="ui.mainLayoutElement.value" defer>
    <BlokkliTransition name="search">
      <div
        v-if="isRendered"
        v-show="isVisible"
        class="bk bk-search"
        :class="{ 'bk-is-translucent': selection.isDragging.value }"
        @click.stop.prevent="isVisible = false"
      >
        <Overlay
          ref="overlay"
          :visible="isVisible"
          :is-dragging="selection.isDragging.value"
          @close="isVisible = false"
        />
      </div>
    </BlokkliTransition>
  </Teleport>
  <PluginToolbarButton
    id="search"
    :title="$t('searchToolbarLabel', 'Search content')"
    meta
    key-code="F"
    region="before-sidebar-right"
    :tour-text="
      $t(
        'searchTourText',
        'Quickly find blocks on the current page or existing content to drag and drop as blocks into the page.',
      )
    "
    icon="bk_mdi_search"
    @click="onClick"
  />
</template>

<script lang="ts" setup>
import {
  nextTick,
  ref,
  useBlokkli,
  defineBlokkliFeature,
  useTemplateRef,
  defineAsyncComponent,
} from '#imports'
import { BlokkliTransition } from '#blokkli/editor/components'
import { PluginToolbarButton } from '#blokkli/editor/plugins'
import {
  onBlokkliEvent,
  defineDropAreas,
  defineDropHandler,
} from '#blokkli/editor/composables'
import { falsy } from '#blokkli/helpers'
import { itemEntityType } from '#blokkli-build/config'
import type { DropArea } from '#blokkli/editor/types/ui'
import type { BlokkliItemHost } from '#blokkli/editor/types/field'

const Overlay = defineAsyncComponent(() => import('./Overlay/index.vue'))

defineBlokkliFeature({
  id: 'search',
  icon: 'bk_mdi_search',
  label: 'Search',
  description:
    'Provides an overlay with shortcut to search for blocks on the current page or existing content to add as blocks.',
})

const { $t, selection, ui, adapter, state, types, directive, permissions } =
  useBlokkli()

const ERROR_MESSAGE = $t(
  'searchContentReplaceFailed',
  'Failed to replace content.',
)

defineDropAreas((dragItems) => {
  if (!adapter.replaceContentSearchItem) {
    return
  }

  if (dragItems.length !== 1) {
    return
  }

  const item = dragItems[0]!

  if (item.itemType !== 'search_content') {
    return
  }

  const searchItem = item.searchItem

  return directive
    .getDroppableElements()
    .map<DropArea | undefined>((field) => {
      if (field.type !== itemEntityType) {
        return
      }

      // Skip blocks where the user lacks edit permission or is inside
      // a restricted ancestor.
      if (
        !permissions.checkBlockBundlePermission(field.bundle, 'edit') ||
        permissions.blockHasRestrictedAncestor(field.uuid)
      ) {
        return
      }

      const config = types.getDroppableFieldConfig(field.fieldName, field)

      // Skip multi-value fields — the droppable-field-edit feature handles those.
      if (config.cardinality !== 1) {
        return
      }

      const allowedBundles = config.allowed.find(
        (v) => v.type === searchItem.entityType,
      )?.bundles
      if (
        !allowedBundles ||
        !allowedBundles.includes(searchItem.entityBundle)
      ) {
        return
      }

      const host: BlokkliItemHost = {
        uuid: field.uuid,
        type: field.type,
        fieldName: field.fieldName,
      }

      const label = $t('searchContentReplace', 'Replace @field').replace(
        '@field',
        config.label,
      )

      return {
        id: `replace-search-content:${field.uuid}:${field.fieldName}`,
        label,
        element: field.element,
        icon: 'bk_mdi_swap_horiz',
        onDrop: () => {
          return state.mutateWithLoadingState(
            () =>
              adapter.replaceContentSearchItem!({
                host,
                item: searchItem,
              }),
            ERROR_MESSAGE,
          )
        },
      }
    })
    .filter(falsy)
})

defineDropHandler('search_content', {
  resolveBundles({ items, field }) {
    const item = items[0]!
    return field.allowedBundles.filter(
      (b) =>
        item.itemBundles.includes(b) &&
        permissions.checkBlockBundlePermission(b, 'add'),
    )
  },

  async execute({ items, host, afterUuid, bundle }) {
    if (!adapter.addContentSearchItem) {
      throw new Error('Adapter does not implement "addContentSearchItem".')
    }
    const item = items[0]!
    await state.mutateWithLoadingState(() =>
      adapter.addContentSearchItem!({
        item: item.searchItem,
        host,
        bundle,
        afterUuid,
      }),
    )
  },
})

const isRendered = ref(false)
const isVisible = ref(false)

const overlay = useTemplateRef('overlay')

function onClick() {
  isRendered.value = true
  isVisible.value = !isVisible.value
  nextTick(() => {
    if (isVisible.value && overlay.value) {
      overlay.value.focusInput()
    }
  })
}

onBlokkliEvent('keyPressed', (e) => {
  if (ui.hasDialogOpen.value) {
    return
  }
  if (e.code === 'Escape') {
    isVisible.value = false
  }
})
</script>

<script lang="ts">
export default {
  name: 'FeatureSearch',
}
</script>

<style lang="postcss">
.bk.bk-search {
  @apply absolute right-0 bottom-0 z-search overflow-hidden md:shadow-xl-left top-40 md:top-0 w-full md:w-[600px] xl:w-[800px] transition pointer-events-auto;
  &.bk-is-translucent {
    @apply opacity-0 pointer-events-none;
  }
}

.bk {
  .bk-search-box {
    @apply relative h-full w-full flex flex-col md:overflow-hidden;
  }
  .bk-search-results {
    @apply flex-1 relative bg-white;
  }
  .bk-search-loading {
    @apply absolute top-0 right-0 z-40 w-full h-full bg-white/40 flex items-center justify-center;
    svg {
      @apply w-50 h-50 text-mono-200 animate-spin fill-mono-400;
    }
  }
  .bk-search-is-loading {
    @apply opacity-50;
  }
  .bk-search-input {
    @apply relative pl-30 md:pl-[50px] bg-mono-900 md:bg-mono-700;
    > .bk-icon {
      @apply text-mono-100 w-20 h-20 absolute top-1/2 -translate-y-1/2 left-10 md:left-20;
      svg {
        @apply fill-current;
      }
    }
    input {
      @apply h-40 md:h-50 appearance-none w-full focus:outline-none focus:shadow-none focus:border-none focus:ring-transparent bg-transparent;
      @apply text-mono-100 md:text-lg font-bold leading-none;
      @apply placeholder-mono-500 placeholder:font-normal;
      @apply pl-10 md:pl-0;
    }
    button {
      @apply absolute top-0 right-0 h-full px-15;
      svg {
        @apply w-20 h-20 fill-mono-100 pointer-events-none;
      }
    }
  }

  .bk-search-item-icon {
    @apply bg-mono-100 flex items-center justify-center border border-mono-200 shrink-0 text-mono-500 relative overflow-hidden;
    @apply p-[0.125em];
    @apply size-40 lg:size-50 xl:size-80;

    .bk-blokkli-item-icon {
      @apply w-full h-full;
    }

    img {
      @apply absolute top-0 left-0 w-full h-full object-cover;
    }
  }

  .bk-search-item-content {
    @apply w-full max-w-full min-w-0;
  }

  .bk-search-item-title {
    @apply font-bold text-sm lg:text-base !leading-tight align-baseline line-clamp-2;
    @apply whitespace-normal break-words;
    div {
      @apply inline-block;
    }
  }

  .bk-search-item-subtitle {
    @apply min-w-0 overflow-hidden w-full text-sm items-baseline;
  }
  .bk-search-item-text {
    @apply min-w-0 whitespace-normal max-w-full break-words line-clamp-2 text-sm;
  }

  .bk-search-no-results {
    @apply absolute top-0 left-0 h-full w-full flex items-center justify-center flex-col text-lg text-mono-500 font-medium;
    svg {
      @apply fill-current w-100 h-100 mb-15;
    }
  }

  .bk-search-tabs {
    @apply flex border-b justify-between bg-white border-b-mono-300;
    li {
      button {
        @apply px-15 py-[12px] lg:p-20 w-full text-center uppercase text-xs md:text-sm text-mono-500;
        &[disabled] {
          @apply pointer-events-none text-mono-300;
        }
      }
      &:not(.bk-is-active):hover button:not([disabled]) {
        @apply text-mono-800;
      }
      &.bk-is-active {
        button {
          @apply font-bold text-accent-700;
        }
      }
    }
  }

  .bk-highlight {
    @apply whitespace-pre;
    em {
      @apply not-italic relative inline-block rounded;
      @apply bg-yellow-normal/30 outline outline-[1px] outline-yellow-normal;
    }
  }
  .bk-search-list {
    @apply overflow-auto h-full overscroll-contain absolute top-0 left-0 w-full;
  }

  .bk-search-item {
    @apply px-20 text-mono-700 py-15 md:py-20 cursor-pointer relative flex gap-10 text-left w-full items-stretch bg-white;

    &.bk-is-content {
      @apply cursor-grab;
    }

    &:after {
      content: '';
      @apply absolute bottom-0 left-0 w-full h-[0.5px] bg-mono-200;
    }

    &.bk-is-active {
      @apply bg-mono-100 text-mono-950;
      .bk-search-item-icon {
        @apply border-accent-700 bg-accent-600 text-white;

        &.bk-is-image {
          @apply outline outline-accent-900 outline-[1px];
        }
      }
    }
  }
}

.bk-vars.bk-dragging-overlay .bk-search-item {
  @apply rounded-lg overflow-hidden;
}
</style>
