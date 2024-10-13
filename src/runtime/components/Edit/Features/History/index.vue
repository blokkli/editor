<template>
  <PluginSidebar
    id="history"
    v-slot="{ scrolledToEnd }"
    :title="$t('history', 'History')"
    :tour-text="
      $t(
        'historyTourText',
        'See a list of all changes made so far and switch back and forth between changes.',
      )
    "
    icon="history"
    weight="-100"
  >
    <div class="bk bk-history bk-control">
      <ul v-if="mapped.length">
        <li
          v-for="item in mapped"
          :key="item.index"
          :class="{
            'bk-is-not-active': item.index > currentMutationIndex,
            'bk-is-active': item.index === currentMutationIndex,
            'bk-is-disabled': !item.enabled,
            'bk-is-applied': item.index < currentMutationIndex && item.enabled,
          }"
        >
          <button
            :disabled="!canEdit"
            class="bk-history-item-button"
            @click="setHistoryIndex(item.index)"
          >
            <div>
              <div>
                <strong>{{ item.mutation.plugin?.label }}</strong>
              </div>
              <RelativeTime
                v-if="item.timestamp"
                v-slot="{ formatted }"
                :timestamp="item.timestamp"
              >
                <em>{{ formatted }}</em>
              </RelativeTime>
            </div>
          </button>
          <div v-if="canSetStatus" class="bk-history-item-actions">
            <button
              @click.prevent="setMutationItemStatus(item.index, !item.enabled)"
            >
              <Icon name="close" />
            </button>
          </div>
        </li>
        <li v-if="totalMutations > showAmount" class="bk-history-load-more">
          <button class="bk-history-item-button" @click="showAmount += 100">
            <strong
              >{{
                $t('historyShowMore', 'Show @count more').replace(
                  '@count',
                  Math.min(totalMutations - showAmount, 100).toString(),
                )
              }}
            </strong>
          </button>
        </li>
        <li
          class="bk-is-last"
          :class="[
            currentMutationIndex === -1 ? 'bk-is-active' : 'bk-is-applied',
            { 'bk-has-shadow': !scrolledToEnd },
          ]"
        >
          <button class="bk-history-item-button" @click="setHistoryIndex(-1)">
            <div>
              <strong>{{
                $t('historyCurrentRevision', 'Current revision')
              }}</strong>
            </div>
            <!-- @TODO: Pass in the timestamp of the entity's latest revision. -->
            <!-- <RelativeTime -->
            <!--   v-if="item.timestamp" -->
            <!--   :timestamp="item.timestamp" -->
            <!--   v-slot="{ formatted }" -->
            <!-- > -->
            <!--   <div>{{ formatted }}</div> -->
            <!-- </RelativeTime> -->
          </button>
        </li>
      </ul>
      <div v-else class="bk-history-empty-message">
        {{ $t('historyEmpty', 'There are now changes yet.') }}
      </div>
    </div>
  </PluginSidebar>

  <PluginToolbarButton
    id="undo"
    :title="$t('historyUndo', 'Undo')"
    meta
    key-code="Z"
    region="before-title"
    :disabled="!canUndo"
    :tour-text="$t('historyUndoTourText', 'Undo the last change.')"
    icon="undo"
    @click="undo"
  />

  <PluginToolbarButton
    id="redo"
    :title="$t('historyRedo', 'Redo')"
    meta
    shift
    key-code="Z"
    region="before-title"
    :disabled="!canRedo"
    :tour-text="$t('historyRedoTourText', 'Redo the previous change.')"
    icon="redo"
    @click="redo"
  />
</template>

<script lang="ts" setup>
import {
  ref,
  computed,
  useBlokkli,
  watch,
  defineBlokkliFeature,
  onMounted,
  onBeforeUnmount,
} from '#imports'
import { PluginSidebar, PluginToolbarButton } from '#blokkli/plugins'
import { RelativeTime, Icon } from '#blokkli/components'
import type { MutationItem } from '#blokkli/types'

const { adapter, settings } = defineBlokkliFeature({
  id: 'history',
  icon: 'history',
  label: 'History',
  requiredAdapterMethods: ['setHistoryIndex'],
  description:
    'Implements support for history features (undo, redo, list of mutations).',
  settings: {
    useMouseButtons: {
      type: 'checkbox',
      label: 'Use mouse buttons for undo/redo',
      default: true,
      group: 'behavior',
      viewports: ['desktop'],
    },
  },
})

const { state, $t, ui } = useBlokkli()

const canSetStatus = !!adapter.setMutationItemStatus

const { mutations, currentMutationIndex, canEdit, mutateWithLoadingState } =
  state

const showAmount = ref(50)
const useMouseForHistory = computed(() => settings.value.useMouseButtons)
const canUndo = computed(() => currentMutationIndex.value >= 0)
const canRedo = computed(
  () => currentMutationIndex.value < mutations.value.length - 1,
)
const totalMutations = computed(() => mutations.value.length)

watch(totalMutations, (newTotal, previousTotal) => {
  if (newTotal !== previousTotal) {
    showAmount.value = 50
  }
})

type HistoryItem = {
  index: number
  mutation: MutationItem
  timestamp: number
  enabled: boolean
}

const mapped = computed<HistoryItem[]>(() =>
  mutations.value
    .map((mutation, index) => {
      return {
        index,
        mutation,
        timestamp: mutation.timestamp ? Number.parseInt(mutation.timestamp) : 0,
        enabled: mutation.enabled !== false,
      }
    })
    .sort((a, b) => {
      return b.timestamp - a.timestamp
    })
    .filter((v, _i, arr) => {
      return v.index >= arr.length - showAmount.value
    }),
)

async function setHistoryIndex(index: number) {
  if (index !== currentMutationIndex.value) {
    await mutateWithLoadingState(() => adapter.setHistoryIndex(index))
  }
}

const undo = () =>
  mutateWithLoadingState(() =>
    adapter.setHistoryIndex(currentMutationIndex.value - 1),
  )
const redo = () =>
  mutateWithLoadingState(() =>
    adapter.setHistoryIndex(currentMutationIndex.value + 1),
  )

async function setMutationItemStatus(index: number, status: boolean) {
  if (!adapter.setMutationItemStatus) {
    return
  }
  await mutateWithLoadingState(() =>
    adapter.setMutationItemStatus!(index, status),
  )
}

const onMouseUp = (e: MouseEvent) => {
  if (e.button === 3) {
    // History back button on the mouse.
    e.preventDefault()
    e.stopPropagation()
    if (canUndo.value) {
      undo()
    }
  } else if (e.button === 4) {
    // History forward button on the mouse.
    e.preventDefault()
    e.stopPropagation()
    if (canRedo.value) {
      redo()
    }
  }
}

const setupMouseListeners = () => {
  document.removeEventListener('mouseup', onMouseUp)
  if (useMouseForHistory.value && ui.isDesktop.value) {
    document.addEventListener('mouseup', onMouseUp)
  }
}

watch(useMouseForHistory, setupMouseListeners)

onMounted(() => {
  setupMouseListeners()
})

onBeforeUnmount(() => {
  document.removeEventListener('mouseup', onMouseUp)
})
</script>

<script lang="ts">
export default {
  name: 'History',
}
</script>
