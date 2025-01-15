<template>
  <div class="bk bk-diff-view bk-scrollbar-light">
    <table class="bk-diff-table">
      <thead>
        <tr>
          <th>{{ $t('diffTableChange', 'Change') }}</th>
          <th>{{ $t('diffTableBundle', 'Type') }}</th>
          <th>{{ $t('diffTableProperty', 'Property') }}</th>
          <th>{{ $t('diffTableDiff', 'Diff') }}</th>
        </tr>
      </thead>
      <tbody>
        <template v-for="item in diffItems" :key="item.uuid">
          <tr class="bk-diff-row">
            <td
              :rowspan="Math.max(1, item.props.length)"
              class="bk-diff-status"
            >
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
            </td>
            <td
              :rowspan="Math.max(1, item.props.length)"
              class="bk-diff-bundle"
            >
              <button
                class="bk-blokkli-item-label"
                :disabled="item.status === 'removed'"
                @click="scrollToBlock(item.uuid)"
              >
                <div class="bk-blokkli-item-label-icon">
                  <ItemIcon :bundle="item.bundle" />
                </div>
                <span>{{ getLabel(item.bundle) }}</span>
              </button>
            </td>

            <template v-if="item.props.length > 0">
              <td>
                <strong>{{ item.props[0].key }}</strong>
              </td>
              <td class="bk-diff-monospace">
                <div class="bk-diff-prop-diff" v-html="item.props[0].diff" />
              </td>
            </template>
            <template v-else>
              <td />
              <td />
            </template>
          </tr>
          <tr
            v-for="prop in item.props.slice(1)"
            :key="prop.key"
            class="bk-diff-prop-row"
          >
            <td>
              <strong>{{ prop.key }}</strong>
            </td>
            <td class="bk-diff-monospace">
              <div class="bk-diff-prop-diff" v-html="prop.diff" />
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed, useBlokkli } from '#imports'
import type { FieldListItem, MutatedField } from '#blokkli/types'
import { ItemIcon } from '#blokkli/components'
import { getDefaultDefinition } from '#blokkli/definitions'
import diff from 'html-diff-ts'

function getProps(bundle: string, props: any): Record<string, string> {
  const definition = getDefaultDefinition(bundle)
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

const { types, $t, adapter, state, eventBus, dom } = useBlokkli()

const stateBefore = await adapter.loadStateAtIndex!(-1).then((v: any) =>
  adapter.mapState(v),
)

function buildDiffItems(fields?: MutatedField[]): FieldListItem[] {
  const items = (fields || []).flatMap((v) => v.list)
  return items
}

const itemsBefore = computed(() =>
  buildDiffItems(stateBefore.mutatedState?.fields),
)
const itemsAfter = computed(() => buildDiffItems(state.mutatedFields.value))

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
          diff: diff(value, ''),
        })),
      })
    } else {
      // Item exists in both arrays.
      const afterProps = getProps(afterItem.bundle, afterItem.props)
      const changedProps: DiffItemProp[] = []

      Object.entries(beforeProps).forEach(([key, beforeValue]) => {
        const afterValue = afterProps[key]
        if (beforeValue !== afterValue) {
          changedProps.push({
            key,
            diff: diff(beforeValue, afterValue),
          })
        }
      })

      // Check for new properties inside afterProps.
      Object.keys(afterProps).forEach((key) => {
        if (!(key in beforeProps)) {
          changedProps.push({
            key,
            diff: diff('', afterProps[key]),
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
          diff: diff('', value),
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

function getLabel(bundle: string): string {
  return types.getBlockBundleDefinition(bundle)?.label || bundle
}

function scrollToBlock(uuid: string) {
  eventBus.emit('scrollIntoView', { uuid, center: true })
  eventBus.emit('select', uuid)
}
</script>
