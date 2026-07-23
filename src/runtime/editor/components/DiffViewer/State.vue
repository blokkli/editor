<template>
  <div class="bk bk-diff-view">
    <div class="bk-diff-mode-selector">
      <FormRadioTabs
        id="diff-viewer-state-display"
        v-model="diffMode"
        :options="diffModeOptions"
        :label="$t('display', 'Display')"
        :scheme
      />
    </div>
    <div class="bk-diff-table" :data-diff-mode="diffMode">
      <button
        v-for="item in diffItems"
        :key="item.uuid"
        class="bk-diff-item"
        :class="{
          'bk-is-muted': showSelect && !selected?.includes(item.uuid),
        }"
        @click.prevent="onClick(item.uuid)"
      >
        <div
          class="bk-diff-item-header"
          :disabled="item.status === 'removed' && !showSelect"
          :class="{
            'bk-is-selected': showSelect && selected?.includes(item.uuid),
          }"
        >
          <div class="bk-blokkli-item-label">
            <div class="bk-blokkli-item-label-icon">
              <ItemIcon :bundle="item.bundle" />
            </div>
            <span>{{ getLabel(item.bundle) }}</span>
          </div>
          <div class="bk-diff-status">
            <div
              v-if="item.status === 'added'"
              class="bk-diff-status-label bk-is-added"
            >
              {{ $t('diffStatusAdded', 'Added') }}
            </div>
            <div
              v-else-if="item.status === 'removed'"
              class="bk-diff-status-label bk-is-removed"
            >
              {{ $t('diffStatusDeleted', 'Deleted') }}
            </div>
            <div
              v-else-if="item.status === 'unchanged'"
              class="bk-diff-status-label"
            >
              {{ $t('diffStatusUnchanged', 'Unchanged') }}
            </div>
            <div v-else class="bk-diff-status-label">
              {{ $t('diffStatusEdited', 'Edited') }}
            </div>
          </div>
        </div>
        <div class="bk-diff-item-diffs">
          <div
            v-for="prop in item.props"
            :key="prop.key"
            class="bk-diff-prop-row"
          >
            <h3>{{ prop.key }}</h3>
            <div class="bk-diff-monospace">
              <DiffDisplay
                :before="prop.before || ''"
                :after="prop.after || ''"
                :mode="diffMode"
              />
            </div>
          </div>
        </div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, useBlokkli } from '#imports'
import type { FieldListItem } from '#blokkli/types'
import {
  ItemIcon,
  FormRadioTabs,
  DiffDisplay,
} from '#blokkli/editor/components'
import type { DiffDisplayMode } from './DiffDisplay/index.vue'
import type { ThemeColorName } from './../../../../global/types/theme'
import type { MappedState, MutatedField } from '#blokkli/editor/types/state'

const props = defineProps<{
  stateBefore: MappedState
  stateAfter: MappedState
  showSelect?: boolean
  includeUuids?: string[]
  selected?: string[]
  scheme?: ThemeColorName
}>()

const { types, $t, eventBus, dom, definitions, storage } = useBlokkli()

const diffMode = storage.use<DiffDisplayMode>('diffMode', 'inline')

const diffModeOptions = computed(() => [
  {
    value: 'inline',
    label: $t('diffModeInline', 'Inline'),
  },
  {
    value: 'side_by_side',
    label: $t('diffModeSideBySide', 'Both'),
  },
  {
    value: 'after',
    label: $t('after', 'After'),
  },
])

const emit = defineEmits<{
  (e: 'toggle', uuid: string): void
}>()

function getProps(bundle: string, props: any): Record<string, string> {
  const definition = definitions.getDefaultDefinition(bundle)
  // Use custom method that builds the diff props.
  if (definition?.editor?.mapDiffProps) {
    return definition.editor.mapDiffProps(props)
  }

  if (typeof props === 'object') {
    return Object.entries(props).reduce<Record<string, string>>(
      (acc, [key, value]) => {
        if (typeof value === 'string' || typeof value === 'number') {
          acc[key] = value.toString()
        } else if (typeof value === 'object') {
          try {
            // Fallback to a JSON representation of the data.
            const json = JSON.stringify(value, null, 2)
            acc[key] = `<pre>${json}</pre>`
          } catch {
            // Noop.
          }
        }
        return acc
      },
      {},
    )
  }

  return {}
}

interface DiffItemProp {
  key: string
  before?: string
  after?: string
}

interface DiffItem {
  uuid: string
  bundle: string
  status: 'changed' | 'added' | 'removed' | 'unchanged'
  props: DiffItemProp[]
}

function buildDiffItems(fields?: MutatedField[]): FieldListItem[] {
  const items = (fields || []).flatMap((v) => v.list)
  return items
}

const itemsBefore = computed(() =>
  buildDiffItems(props.stateBefore.mutatedState?.fields),
)
const itemsAfter = computed(() =>
  buildDiffItems(props.stateAfter.mutatedState?.fields),
)

function toString(v?: unknown): string {
  if (typeof v === 'string') {
    return v
  } else if (typeof v === 'number') {
    return v.toString()
  }
  return ''
}

const diffItems = computed<DiffItem[]>(() => {
  const diffMap = new Map<string, DiffItem>()

  itemsBefore.value.forEach((beforeItem) => {
    if (props.includeUuids && !props.includeUuids.includes(beforeItem.uuid)) {
      return
    }

    const afterItem = itemsAfter.value.find(
      (item) => item.uuid === beforeItem.uuid,
    )
    const beforeProps = getProps(beforeItem.bundle, beforeItem.props)

    // Item has been removed.
    if (!afterItem) {
      diffMap.set(beforeItem.uuid, {
        uuid: beforeItem.uuid,
        bundle: beforeItem.bundle,
        status: 'removed',
        props: Object.entries(beforeProps).map(([key, value]) => ({
          key,
          before: toString(value),
          after: '',
        })),
      })
    } else {
      // Item exists in both arrays.
      const afterProps = getProps(afterItem.bundle, afterItem.props)
      const changedProps: DiffItemProp[] = []

      Object.entries(beforeProps).forEach(([key, beforeValue]) => {
        const afterValue = afterProps[key]!
        if (beforeValue !== afterValue) {
          changedProps.push({
            key,
            before: toString(beforeValue),
            after: toString(afterValue),
          })
        }
      })

      // Check for new properties inside afterProps.
      Object.keys(afterProps).forEach((key) => {
        if (!(key in beforeProps)) {
          changedProps.push({
            key,
            before: '',
            after: toString(afterProps[key]!),
          })
        }
      })

      // Only add the item if it has changes.
      if (changedProps.length > 0) {
        diffMap.set(beforeItem.uuid, {
          uuid: beforeItem.uuid,
          bundle: beforeItem.bundle,
          status: 'changed',
          props: changedProps,
        })
      } else if (props.includeUuids) {
        // Add unchanged items when includeUuids is provided.
        diffMap.set(beforeItem.uuid, {
          uuid: beforeItem.uuid,
          bundle: beforeItem.bundle,
          status: 'unchanged',
          props: [],
        })
      }
    }
  })

  // Process added items.
  itemsAfter.value.forEach((afterItem) => {
    if (!itemsBefore.value.some((item) => item.uuid === afterItem.uuid)) {
      const afterProps = getProps(afterItem.bundle, afterItem.props)
      diffMap.set(afterItem.uuid, {
        uuid: afterItem.uuid,
        bundle: afterItem.bundle,
        status: 'added',
        props: Object.entries(afterProps).map(([key, value]) => ({
          key,
          before: '',
          after: toString(value),
        })),
      })
    }
  })

  return Array.from(diffMap.values()).sort((a, b) => {
    const aY = dom.getBlockRect(a.uuid)?.y || 0
    const bY = dom.getBlockRect(b.uuid)?.y || 0
    return aY - bY
  })
})

function onClick(uuid: string) {
  if (props.showSelect) {
    emit('toggle', uuid)
  } else {
    scrollToBlock(uuid)
  }
}

function getLabel(bundle: string): string {
  return types.getBlockBundleDefinition(bundle)?.label || bundle
}

function scrollToBlock(uuid: string) {
  eventBus.emit('scrollIntoView', { uuid, center: true })
  eventBus.emit('select', uuid)
}
</script>

<style lang="postcss">
.bk {
  &.bk-diff-sidebar-pane {
    @apply absolute top-0 left-0 w-full h-full;
    @apply overflow-auto overscroll-contain;
  }

  &.bk-diff-view {
    @apply select-text;
    container-type: inline-size;
    .bk-blokkli-item-label {
      @apply font-semibold flex-1;
      span {
        @apply leading-none;
      }
      &[disabled] {
        @apply pointer-events-none;
      }
    }
  }

  .bk-diff-mode-selector {
    @apply p-20 border-b border-mono-300;
  }

  .bk-diff-table {
    @apply w-full;
  }

  .bk-diff-item {
    @apply border-t border-t-mono-300 text-mono-900 w-full;
    @apply hover:bg-mono-100;
    &.bk-is-muted {
      .bk-diff-item-diffs,
      .bk-diff-status {
        @apply opacity-50;
      }
      .bk-blokkli-item-label span {
        @apply text-mono-400;
      }
    }
  }

  .bk-diff-item-diffs {
  }

  .bk-diff-item-header {
    @apply flex w-full p-20 items-center;
    &.bk-is-selected {
      .bk-blokkli-item-label-icon {
        @apply bg-orange-normal border-orange-dark/30 text-orange-dark;
      }
    }
  }

  .bk-diff-prop-row {
    @apply px-20;
    @apply mb-20;

    h3 {
      @apply font-semibold text-sm mb-5;
    }
  }

  .bk-diff-monospace {
    @apply font-mono text-sm;
  }

  .bk-diff-markup-style {
    p,
    ul,
    ol,
    h1,
    h2,
    h3,
    h4,
    h5,
    h6 {
      @apply my-20 first:mt-0 last:mb-0;
    }

    h1,
    h2,
    h3,
    h4,
    h5,
    h6 {
      @apply leading-tight;
    }

    p,
    ul,
    ol {
      @apply leading-normal;
    }

    h2 {
      @apply font-bold text-[1.7em];
    }

    h3 {
      @apply text-[1.5em] font-bold;
    }

    h4 {
      @apply text-[1.3em] font-bold;
    }

    ul {
      @apply list-disc ml-18;
    }

    ol {
      @apply ml-30 list-decimal;
    }

    a {
      @apply text-accent-700 underline;
    }

    blockquote {
      @apply border-l-[6px] border-l-mono-300 pl-20;
    }

    pre {
      @apply whitespace-break-spaces break-words w-full max-w-full;
      word-break: break-all;
    }
  }

  .bk-diff-prop-side-by-side {
    @apply grid gap-10;
    @container (min-width: 700px) {
      @apply grid-cols-2;
    }

    .bk-diff-prop-before,
    .bk-diff-prop-after {
      @apply border border-mono-300 rounded p-10;
    }

    .bk-diff-prop-before {
      @apply bg-red-light/20;
      .bk-diff-prop-label {
        @apply text-red-normal;
      }
    }

    .bk-diff-prop-after {
      @apply bg-lime-light/20;
      .bk-diff-prop-label {
        @apply text-lime-normal;
      }
    }

    .bk-diff-prop-label {
      @apply text-xs font-semibold uppercase tracking-wider mb-5 text-mono-500;
    }

    .bk-diff-prop-content {
      word-break: break-word;
    }
  }

  .bk-diff-prop-after-only {
    .bk-diff-prop-content {
      @apply bg-lime-light/20 border border-lime-normal/30 rounded p-10;
      word-break: break-word;
    }
  }

  .bk-diff-status-label {
    @apply uppercase text-xs font-semibold tracking-wider translate-y-[-3px] rounded-full px-[7px] py-[2px] inline-block;
    @apply bg-mono-200 text-mono-500;

    &.bk-is-added {
      @apply text-white bg-lime-normal;
    }

    &.bk-is-removed {
      @apply text-white bg-red-normal;
    }
  }
}
</style>
