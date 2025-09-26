<template>
  <div class="bk bk-diff-view">
    <div class="bk-diff-table">
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
              <div class="bk-diff-prop-diff" v-html="prop.diff" />
            </div>
          </div>
        </div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, useBlokkli } from '#imports'
import type { FieldListItem, MappedState, MutatedField } from '#blokkli/types'
import { ItemIcon } from '#blokkli/components'
import diff from 'html-diff-ts'

const props = defineProps<{
  stateBefore: MappedState
  stateAfter: MappedState
  showSelect?: boolean
  selected?: string[]
}>()

const { types, $t, eventBus, dom, definitions } = useBlokkli()

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
  diff?: string
}

interface DiffItem {
  uuid: string
  bundle: string
  status: 'changed' | 'added' | 'removed'
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
          value,
          diff: diff(toString(value), ''),
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
            diff: diff(toString(beforeValue), toString(afterValue)),
          })
        }
      })

      // Check for new properties inside afterProps.
      Object.keys(afterProps).forEach((key) => {
        if (!(key in beforeProps)) {
          changedProps.push({
            key,
            diff: diff('', toString(afterProps[key]!)),
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
          diff: diff('', toString(value)),
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
