<template>
  <PluginSidebar
    id="media_library"
    :title="$t('mediaLibrary', 'Media Library')"
    :tour-text="
      $t(
        'mediaLibraryTourText',
        'Search for media like images and drag and drop them into the page.',
      )
    "
    edit-only
    icon="bk_mdi_image"
    weight="-100"
  >
    <Library is-sortli />
  </PluginSidebar>
</template>

<script lang="ts" setup>
import { useBlokkli, defineBlokkliFeature } from '#imports'
import { PluginSidebar } from '#blokkli/editor/plugins'
import Library from './Library/index.vue'
import { falsy } from '#blokkli/helpers'
import { itemEntityType } from '#blokkli-build/config'
import { defineDropAreas, defineDropHandler } from '#blokkli/editor/composables'
import type { DropArea } from '#blokkli/editor/types/ui'
import type { BlokkliItemHost } from '#blokkli/editor/types/field'

defineBlokkliFeature({
  id: 'media-library',
  icon: 'bk_mdi_image',
  label: 'Media Library',
  description:
    'Implements a media library to easily drag and drop media like images or videos.',
  requiredAdapterMethods: ['mediaLibraryGetResults', 'mediaLibraryAddBlock'],
})

const { $t, adapter, state, types, directive, permissions } = useBlokkli()

const ERROR_MESSAGE = $t(
  'mediaLibraryReplaceFailed',
  'Failed to replace media.',
)

defineDropAreas((dragItems) => {
  // Not supported by adapter.
  if (!adapter.mediaLibraryReplaceMedia) {
    return
  }

  // Only a single item is supported.
  if (dragItems.length !== 1) {
    return
  }

  const item = dragItems[0]!

  // Not a media library item.
  if (item.itemType !== 'media_library') {
    return
  }

  // @TODO: Restore this behaviour.
  // Ignore elements that are rendered inside a field that uses proxy mode, since implementations might use <BlokkliItem> to render blocks in a proxy-mode field.
  // return !el.closest('[data-bk-in-proxy="true"]')

  // Generate a drop area for every matching droppable field.
  return directive
    .getDroppableElements()
    .map<DropArea | undefined>((field) => {
      const config = types.getDroppableFieldConfig(field.fieldName, field)
      const allowedBundles = config.allowed.find(
        (v) => v.type === 'media',
      )?.bundles
      // @TODO: This should be provided by the adapter on the item.
      if (!allowedBundles || !allowedBundles.includes(item.mediaBundle)) {
        return
      }

      const isBlock = field.type === itemEntityType

      // Skip blocks where the user lacks edit permission or is inside
      // a restricted ancestor.
      if (
        isBlock &&
        (!permissions.checkBlockBundlePermission(field.bundle, 'edit') ||
          permissions.blockHasRestrictedAncestor(field.uuid))
      ) {
        return
      }

      const draggableHost: BlokkliItemHost = {
        uuid: field.uuid,
        type: field.type,
        fieldName: field.fieldName,
      }
      const label = $t('mediaLibraryReplaceMedia', 'Replace @field').replace(
        '@field',
        config.label,
      )

      if (adapter.mediaLibraryReplaceMedia && isBlock) {
        return {
          id: `replace-media:${field.uuid}:${field.fieldName}`,
          label,
          element: field.element,
          icon: 'bk_mdi_swap_horiz',
          onDrop: () => {
            return state.mutateWithLoadingState(
              () =>
                adapter.mediaLibraryReplaceMedia!({
                  host: draggableHost,
                  mediaId: item.mediaId,
                }),
              ERROR_MESSAGE,
            )
          },
        }
      } else if (adapter.mediaLibraryReplaceEntityMedia && !isBlock) {
        return {
          id: `replace-entity-media:${field.uuid}:${field.fieldName}`,
          label,
          element: field.element,
          icon: 'bk_mdi_swap_horiz',
          onDrop: () => {
            return state.mutateWithLoadingState(
              () =>
                adapter.mediaLibraryReplaceEntityMedia!({
                  host: draggableHost,
                  mediaId: item.mediaId,
                }),
              ERROR_MESSAGE,
            )
          },
        }
      }
    })
    .filter(falsy)
})

defineDropHandler('media_library', {
  resolveBundles({ items, field }) {
    // All media library items must be of the same bundle.
    const allSameBundles =
      [...new Set(items.map((v) => v.mediaBundle)).values()].length === 1
    if (!allSameBundles) {
      return []
    }
    const item = items[0]!
    return field.allowedBundles.filter(
      (b) =>
        item.itemBundles.includes(b) &&
        permissions.checkBlockBundlePermission(b, 'add'),
    )
  },

  async execute({ items, host, afterUuid, bundle }) {
    if (adapter.mediaLibraryAddBlock && items.length === 1) {
      await state.mutateWithLoadingState(() =>
        adapter.mediaLibraryAddBlock!({
          preceedingUuid: afterUuid,
          host,
          item: items[0]!,
          targetBundle: bundle,
        }),
      )
    } else if (adapter.mediaLibraryAddBlocks && items.length > 1) {
      await state.mutateWithLoadingState(() =>
        adapter.mediaLibraryAddBlocks!({
          preceedingUuid: afterUuid,
          host,
          items,
          targetBundle: bundle,
        }),
      )
    }
  },
})
</script>

<script lang="ts">
export default {
  name: 'MediaLibrary',
}
</script>

<style lang="postcss">
.bk.bk-media-library {
  @apply w-full overflow-auto h-full;
  container-type: inline-size;

  .bk-pagination {
    @apply sticky bottom-0 z-50 bg-white;
  }

  .bk-media-library-filters {
    @apply flex whitespace-nowrap flex-wrap relative z-[5000];
    flex: 0 0 auto;
    > div {
      @apply border-b border-b-mono-300 border-r border-r-mono-300 h-[54px] flex-1;
      @apply hover:bg-mono-100;

      .bk-checkbox-toggle {
        @apply w-full py-15 px-10 cursor-pointer;
        .bk-checkbox-toggle-label-label {
          @apply text-sm;
        }
      }

      .bk-form-text {
        @apply relative;
        .bk-icon {
          @apply absolute top-1/2 left-5 -translate-y-1/2 z-50 size-20;
          @apply text-mono-500;
          svg {
            @apply fill-current;
          }
        }
        input {
          @apply bg-transparent text-sm;
        }

        &:focus-within {
          .bk-icon {
            @apply text-accent-700;
          }
        }

        > input {
          @apply w-full pl-30 !pr-5 h-full block;
          @apply min-w-[200px];
        }
      }
    }
  }

  .bk-media-library-items {
    @apply w-full min-w-0;
    > div {
      @apply w-full min-w-0;
    }

    &.bk-is-grid > div {
      @apply grid grid-cols-2 pt-10;
      @container (min-width: 500px) {
        @apply grid-cols-3;
      }

      @container (min-width: 600px) {
        @apply grid-cols-4;
      }

      @container (min-width: 800px) {
        @apply grid-cols-5;
      }

      @container (min-width: 1000px) {
        @apply grid-cols-6;
      }

      @container (min-width: 1200px) {
        @apply grid-cols-7;
      }

      @container (min-width: 1400px) {
        @apply grid-cols-8;
      }

      @container (min-width: 1600px) {
        @apply grid-cols-9;
      }

      @container (min-width: 1800px) {
        @apply grid-cols-10;
      }

      @container (min-width: 2000px) {
        @apply grid-cols-11;
      }
    }

    &.bk-is-horizontal > div {
      @apply grid;
    }
  }

  .bk-media-library-filter-select {
    @apply relative h-full;

    > button {
      @apply w-full h-full text-left px-10 cursor-pointer  flex items-center justify-between;
      @apply min-w-[150px];

      > div:first-child {
        @apply flex flex-col h-full justify-center gap-5;
      }

      > .bk-icon {
        @apply w-25 h-25 text-mono-500 shrink-0 transition-transform;
        svg {
          @apply fill-current;
        }
      }

      .bk-media-library-filter-select-label {
        @apply text-xs uppercase tracking-wide font-semibold text-mono-500 leading-none;
      }

      .bk-media-library-filter-select-value {
        @apply text-sm font-semibold text-mono-900 !leading-none truncate max-w-full block;
      }
    }

    &.bk-is-open > button > .bk-icon {
      @apply rotate-180;
    }

    .bk-media-library-filter-select-dropdown {
      @apply absolute top-full left-0 w-full  bg-white border border-mono-300 shadow-lg z-50 max-h-[300px] overflow-auto;

      .bk-media-library-filter-select-search {
        @apply sticky top-0  p-15 border-b border-mono-300 bg-white;
      }

      ul {
        @apply py-3;
      }

      li button {
        @apply w-full text-left px-20 py-8 text-sm cursor-pointer truncate text-mono-900;
        @apply hover:bg-accent-50 hover:text-accent-900;

        &.bk-is-highlighted {
          @apply bg-accent-50 text-accent-900;
        }

        &.bk-is-active {
          @apply bg-accent-100 text-accent-900 font-semibold;
        }
      }

      .bk-media-library-filter-select-empty {
        @apply px-20 py-10 text-sm text-mono-400 italic;
      }
    }
  }

  .bk-media-library-filters-listview {
    @apply aspect-square w-[54px] flex items-center justify-center;
    flex: 0 0 54px !important;
    button {
      @apply w-full h-full flex items-center justify-center text-mono-500 hover:text-mono-900;
    }
    .bk-icon {
      @apply w-25 h-25;
      svg {
        @apply fill-current;
      }
    }
  }

  .bk-loading {
    @apply absolute inset-0 flex items-center justify-center bg-white/80 z-40;

    svg {
      @apply w-50 h-50 fill-mono-400;
    }
  }

  .bk-media-library-cancel {
    @apply absolute bottom-0 left-0 w-full p-10 bg-white;

    button {
      @apply w-full;
    }
  }
}

.bk {
  .bk-media-library-items-item {
    @apply text-sm cursor-grab select-none relative;

    &.bk-is-disabled {
      @apply pointer-events-none opacity-25;
    }

    &:hover {
      label {
        @apply !opacity-100;
      }
    }

    &.bk-is-selected {
      .bk-media-library-items-item-image {
        &:before {
          content: '';
          @apply absolute top-0 left-0 size-full bg-accent-700/35 z-50 pointer-events-none;
          @apply border-3 border-accent-700;
          border-radius: inherit;
        }
      }
      label {
        @apply !opacity-100;
      }
    }

    &:hover {
      .bk-media-library-items-item-image {
        @apply border-mono-400;
      }

      label {
        @apply opacity-100;
      }
    }

    h3 {
      @apply font-semibold break-words;
    }

    p {
      @apply break-words;
    }

    .bk-media-library-items-item-box {
      @apply relative;
      > label {
        @apply absolute top-0 right-0 z-50 cursor-pointer opacity-0 p-10;

        &:hover {
          input {
            @apply bg-accent-100;
          }
        }

        input {
          @apply cursor-pointer checked:bg-accent-700;
          @apply bg-white border border-mono-400 rounded;
        }
      }
    }

    .bk-media-library-items-item-image {
      @apply aspect-square w-full overflow-hidden relative border border-mono-300 rounded block;
      img {
        @apply object-cover absolute top-0 left-0 w-full h-full;
      }
    }

    .bk-media-library-items-item-text {
      @apply line-clamp-5;
    }

    &.bk-is-grid {
      @apply p-10 hover:bg-mono-100;
      h3 {
        @apply mt-5;
      }
    }

    &.bk-is-horizontal {
      @apply flex w-full min-w-0 gap-15 p-15 hover:bg-mono-100;
      .bk-media-library-items-item-image {
        @apply w-90;
        @container (min-width: 400px) {
          @apply w-120;
        }
      }
      .bk-media-library-items-item-text {
        @apply flex-1;
      }
    }
  }
}

.bk-dragging-overlay {
  .bk-media-library-items-item {
    @apply bg-mono-100 rounded-lg overflow-hidden;
  }
}
</style>
