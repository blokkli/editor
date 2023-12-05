<template>
  <PluginSidebar
    id="history"
    title="Änderungen"
    icon="history"
    v-slot="{ scrolledToEnd }"
  >
    <div class="bk bk-history bk-control">
      <ul>
        <li
          v-for="item in mapped"
          :class="{
            'is-first': item.index === mutations.length - 1,
            'is-not-active': item.index > currentMutationIndex,
            'is-active': item.index === currentMutationIndex,
            'is-applied': item.index < currentMutationIndex,
          }"
        >
          <button
            @click="setHistoryIndex(item.index, item)"
            :disabled="!canEdit"
          >
            <div>
              <div>
                <strong>{{ item.mutation.plugin?.label }}</strong>
              </div>
              <RelativeTime
                v-if="item.timestamp"
                :timestamp="item.timestamp"
                v-slot="{ formatted }"
              >
                <em>{{ formatted }}</em>
              </RelativeTime>
            </div>
          </button>
        </li>
        <li v-if="totalMutations > showAmount" class="bk-history-load-more">
          <button @click="showAmount += 100">
            <strong
              >{{ Math.min(totalMutations - showAmount, 100) }} weitere
              anzeigen</strong
            >
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
              <strong>Aktuelle Revision</strong>
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
    title="Rückgängig"
    meta
    key-code="Z"
    region="before-title"
    :disabled="!canUndo"
    @click="undo"
    icon="undo"
  />

  <PluginToolbarButton
    title="Wiederherstellen"
    meta
    shift
    key-code="Z"
    region="before-title"
    :disabled="!canRedo"
    @click="redo"
    icon="redo"
  />
</template>

<script lang="ts" setup>
import { PluginSidebar, PluginToolbarButton } from '#blokkli/plugins'
import { RelativeTime } from '#blokkli/components'
import { BlokkliMutationItem } from '#blokkli/types'

const { adapter, eventBus, state } = useBlokkli()

const { mutations, currentMutationIndex, canEdit, mutateWithLoadingState } =
  state

const showAmount = ref(50)

const canUndo = computed(() => currentMutationIndex.value >= 0)

const canRedo = computed(
  () => currentMutationIndex.value < mutations.value.length - 1,
)

const totalMutations = computed(() => {
  return mutations.value.length
})

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

const mapped = computed<HistoryItem[]>(() => {
  return mutations.value
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
    .filter((v, i, arr) => {
      return v.index >= arr.length - showAmount.value
    })
})

async function setHistoryIndex(index: number, item?: HistoryItem) {
  if (index !== currentMutationIndex.value) {
    const affected = item?.mutation?.plugin?.affectedParagraphUuid
    await mutateWithLoadingState(adapter.setHistoryIndex(index))
    if (affected) {
      nextTick(() => {
        eventBus.emit('select', affected)
        eventBus.emit('paragraph:scrollIntoView', { uuid: affected })
      })
    }
  }
}

const undo = () => mutateWithLoadingState(adapter.undo())
const redo = () => mutateWithLoadingState(adapter.redo())

onMounted(() => {})
</script>
