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
    <Library />
  </PluginSidebar>
</template>

<script lang="ts" setup>
import {
  useBlokkli,
  defineBlokkliFeature,
  defineAsyncComponent,
} from '#imports'
import { PluginSidebar } from '#blokkli/editor/plugins'
import { defineDropAreas, defineDropHandler } from '#blokkli/editor/composables'
import type { DropArea } from '#blokkli/editor/types/ui'
import { getReplaceMediaTargets } from './helpers'

const Library = defineAsyncComponent(() => import('./Library/index.vue'))

defineBlokkliFeature({
  id: 'media-library',
  icon: 'bk_mdi_image',
  label: 'Media Library',
  description:
    'Implements a media library to easily drag and drop media like images or videos.',
  requiredAdapterMethods: ['mediaLibraryGetResults', 'mediaLibraryAddBlock'],
})

const app = useBlokkli()
const { $t, adapter, state, permissions } = app

defineDropAreas((dragItems) => {
  // Only a single item is supported.
  if (dragItems.length !== 1) {
    return
  }

  const item = dragItems[0]!

  // Not a media library item.
  if (item.itemType !== 'media_library') {
    return
  }

  // A drop area for every droppable field whose media the item can replace.
  // @TODO: The media bundle should be provided by the adapter on the item.
  return getReplaceMediaTargets(app, item.mediaBundle).map<DropArea>(
    (target) => ({
      id: target.id,
      label: target.label,
      element: target.element,
      icon: 'bk_mdi_swap_horiz',
      onDrop: () => target.replace(item.mediaId),
    }),
  )
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
  /* Its filters would be above the overlay for files dragged over it. */
  isolation: isolate;

  .bk-pagination {
    @apply sticky bottom-0 z-50 bg-white;
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

.bk-vars.bk-dragging-overlay {
  .bk-media-library-items-item {
    @apply bg-mono-100 rounded overflow-hidden;
  }
}
</style>
