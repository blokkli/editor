<template>
  <PluginSidebar
    id="structure"
    :title="$t('structureToolbarLabel', 'Structure')"
    :tour-text="
      $t(
        'structureTourText',
        'Shows a structured list of all blocks on the current page. Click on any block to quickly jump to it.',
      )
    "
    icon="bk_mdi_account_tree"
    weight="-90"
  >
    <ScrollBoundary
      v-if="isLoaded"
      id="bk-structure"
      class="bk bk-structure bk-control"
      dragging
    >
      <List
        :entity-bundle="context.entityBundle"
        :entity-type="context.entityType"
        :entity-uuid="context.entityUuid"
        :visible-field-keys="visibleFieldKeys"
      />
    </ScrollBoundary>
  </PluginSidebar>
</template>

<script lang="ts" setup>
import {
  ref,
  useBlokkli,
  defineBlokkliFeature,
  provide,
  onBeforeUnmount,
  onMounted,
  reactive,
  defineAsyncComponent,
} from '#imports'
import { PluginSidebar } from '#blokkli/editor/plugins'
import { ScrollBoundary } from '#blokkli/editor/components'
import { defineDropHandler } from '#blokkli/editor/composables'

const List = defineAsyncComponent(() => import('./List/index.vue'))

defineBlokkliFeature({
  id: 'structure',
  icon: 'bk_mdi_account_tree',
  label: 'Structure',
  description:
    'Provides a sidebar button to render a structured list of all blocks on the current page.',
})

const { $t, context, adapter, state, dom, ui, eventBus } = useBlokkli()

// existing_structure: move structure blocks.
defineDropHandler('existing_structure', {
  async execute({ items, host, afterUuid }) {
    const uuids = items.map((v) => v.block.uuid)

    await state.mutateWithLoadingState(() =>
      adapter.moveMultipleBlocks({
        uuids,
        afterUuid,
        host,
      }),
    )

    if (uuids.length >= 1 && uuids.length <= 10) {
      for (let i = 0; i < uuids.length; i++) {
        dom.refreshBlockRect(uuids[i]!)
      }
    }

    if (ui.isMobile.value && uuids.length) {
      eventBus.emit('scrollIntoView', {
        uuid: uuids[0]!,
        center: true,
      })
    }
  },
})

const isLoaded = ref(false)

const visibleFieldKeys = reactive<Record<string, boolean>>({})

const observer = new IntersectionObserver(function (entries) {
  for (const entry of entries) {
    if (entry.target instanceof HTMLElement) {
      const key = entry.target.dataset.structureFieldKey
      if (key) {
        visibleFieldKeys[key] = entry.isIntersecting
      }
    }
  }
})

provide('bk_structure_observer', observer)

onMounted(() => {
  isLoaded.value = true
})

onBeforeUnmount(() => {
  observer.disconnect()
})
</script>

<script lang="ts">
export default {
  name: 'Structure',
}
</script>

<style lang="postcss">
.bk.bk-structure {
  @apply h-full overflow-auto bg-white;

  > .bk-structure-list {
    > li {
      @apply border-b border-b-mono-300 py-10;

      > .bk-structure-item {
        @apply border-l-0 border-r-0;
      }
    }
    .bk-structure-list {
      @apply relative pl-[11px];

      > li:not(:first-child) > .bk-structure-field > .bk-structure-field-label {
        @apply mt-[20px];
      }
      &:before {
        content: '';
        @apply absolute top-[-9px] left-[11px] w-0 border-l border-l-mono-400 bottom-[18px];
      }

      .bk-structure-item-label {
        @apply h-[40px] cursor-grab;
        &:before {
          content: '';
          @apply absolute h-1 left-[-20px] w-[19px] top-[22px] border-t border-t-mono-400;
        }
      }
    }
  }

  .bk-structure-item {
    @apply border border-transparent;
    @apply pl-20 hover:border-mono-300;
    @apply hover:bg-mono-300/20;
    .bk-blokkli-item-icon {
      @apply w-25 h-25 bg-mono-100 p-3 rounded border border-mono-400;

      &.bk-is-selected {
        @apply bg-accent-700 text-white border-accent-900;
      }
    }

    &.bk-is-selected {
      > .bk-structure-item-label {
        @apply font-semibold;
      }
      .bk-structure-list:before {
        @apply border-l-accent-500;
      }

      .bk-structure-item {
        .bk-structure-item-label:before {
          @apply border-t-accent-500;
        }
        .bk-blokkli-item-icon {
          @apply bg-accent-50 text-accent-800 border-accent-400;
        }
      }
    }
  }

  .bk-structure-item-label {
    @apply flex items-center gap-5 leading-none relative text-sm text-mono-800 w-full py-10;
  }

  .bk-structure-field-label {
    @apply uppercase text-xs text-mono-600 font-medium h-20 flex items-center pl-[17px] mb-5;
  }

  .bk-structure-field-item {
    @apply relative;
  }

  .bk-structure-field-items {
    @apply relative;
  }

  .bk-structure-field-target {
    @apply h-[40px] w-full absolute;
    @apply opacity-20 hover:opacity-100;
    @apply border-b-4 border-b-accent-700;

    &.bk-is-before {
      @apply -top-[40px];
    }

    &.bk-is-after {
      @apply bottom-0;
    }
  }
}
</style>
