<template>
  <PluginSidebar
    id="history"
    v-slot="{ scrolledToEnd }"
    :title="$t('history')"
    icon="history"
    weight="-100"
  >
    <div class="bk bk-history bk-control">
      <ul>
        <li
          v-for="item in mapped"
          :key="item.index"
          :class="{
            'is-first': item.index === mutations.length - 1,
            'is-not-active': item.index > currentMutationIndex,
            'is-active': item.index === currentMutationIndex,
            'is-applied': item.index < currentMutationIndex,
          }"
        >
          <button
            :disabled="!canEdit"
            @click="setHistoryIndex(item.index, item)"
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
        </li>
        <li v-if="totalMutations > showAmount" class="bk-history-load-more">
          <button @click="showAmount += 100">
            <strong
              >{{
                $t('historyShowMore').replace(
                  '@count',
                  Math.min(totalMutations - showAmount, 100).toString(),
                )
              }}
            </strong>
          </button>
        </li>
        <li
          class="is-last"
          :class="[
            currentMutationIndex === -1 ? 'is-active' : 'is-applied',
            { 'bk-has-shadow': !scrolledToEnd },
          ]"
        >
          <button @click="setHistoryIndex(-1)">
            <div>
              <strong>{{ $t('historyCurrentRevision') }}</strong>
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
    </div>
  </PluginSidebar>

  <PluginToolbarButton
    :title="$t('historyUndo')"
    meta
    key-code="Z"
    region="before-title"
    :disabled="!canUndo"
    icon="undo"
    @click="undo"
  />

  <PluginToolbarButton
    :title="$t('historyRedo')"
    meta
    shift
    key-code="Z"
    region="before-title"
    :disabled="!canRedo"
    icon="redo"
    @click="redo"
  />
</template>

<script lang="ts" setup>
import {
  ref,
  computed,
  useBlokkli,
  nextTick,
  watch,
  defineBlokkliFeature,
} from '#imports'
import { PluginSidebar, PluginToolbarButton } from '#blokkli/plugins'
import { RelativeTime } from '#blokkli/components'
import type { BlokkliMutationItem } from '#blokkli/types'

const adapter = defineBlokkliFeature({
  requiredAdapterMethods: ['setHistoryIndex'],
  description:
    'Implements support for history features (undo, redo, list of mutations).',
})

const { eventBus, state, $t } = useBlokkli()

const { mutations, currentMutationIndex, canEdit, mutateWithLoadingState } =
  state

const showAmount = ref(50)
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
  mutation: BlokkliMutationItem
  timestamp: number
}

const mapped = computed<HistoryItem[]>(() =>
  mutations.value
    .map((mutation, index) => {
      return {
        index,
        mutation,
        timestamp: mutation.timestamp ? parseInt(mutation.timestamp) : 0,
      }
    })
    .sort((a, b) => {
      return b.timestamp - a.timestamp
    })
    .filter((v, _i, arr) => {
      return v.index >= arr.length - showAmount.value
    }),
)

async function setHistoryIndex(index: number, item?: HistoryItem) {
  if (index !== currentMutationIndex.value) {
    const affected = item?.mutation?.plugin?.affectedItemUuid
    await mutateWithLoadingState(adapter.setHistoryIndex(index))
    if (affected) {
      nextTick(() => {
        eventBus.emit('select', affected)
        eventBus.emit('scrollIntoView', { uuid: affected })
      })
    }
  }
}

const undo = () =>
  mutateWithLoadingState(
    adapter.setHistoryIndex(currentMutationIndex.value - 1),
  )
const redo = () =>
  mutateWithLoadingState(
    adapter.setHistoryIndex(currentMutationIndex.value + 1),
  )
</script>

<script lang="ts">
export default {
  name: 'History',
}
</script>
