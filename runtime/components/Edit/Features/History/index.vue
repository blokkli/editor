<template>
  <PluginSidebar id="history" title="Änderungen">
    <template #icon>
      <Icon />
    </template>
    <div class="pb pb-history pb-control">
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
        <li
          class="is-last"
          :class="currentMutationIndex === -1 ? 'is-active' : 'is-applied'"
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
      <div class="pb-history-load-more" v-if="totalMutations > showAmount">
        <button class="pb-button" @click="showAmount += 20">
          Mehr anzeigen
        </button>
      </div>
    </div>
  </PluginSidebar>

  <PluginToolbarButton
    title="Rückgängig"
    meta
    key-code="Z"
    region="before-title"
    :disabled="!canUndo"
    @click="undo"
  >
    <IconUndo />
  </PluginToolbarButton>

  <PluginToolbarButton
    title="Wiederherstellen"
    meta
    shift
    key-code="Z"
    region="before-title"
    :disabled="!canRedo"
    @click="redo"
  >
    <IconRedo />
  </PluginToolbarButton>
</template>

<script lang="ts" setup>
import PluginSidebar from './../../Plugin/Sidebar/index.vue'
import PluginToolbarButton from './../../Plugin/ToolbarButton/index.vue'
import Icon from './../../Icons/History.vue'
import IconUndo from './../../Icons/Undo.vue'
import IconRedo from './../../Icons/Redo.vue'
import RelativeTime from './../../RelativeTime/index.vue'
import { PbMutation } from '~/modules/nuxt-paragraphs-builder/runtime/types'

const {
  mutations,
  currentMutationIndex,
  canEdit,
  adapter,
  mutateWithLoadingState,
  eventBus,
} = useParagraphsBuilderStore()

const showAmount = ref(10)

const canUndo = computed(() => currentMutationIndex.value >= 0)

const canRedo = computed(
  () => currentMutationIndex.value < mutations.value.length - 1,
)

const totalMutations = computed(() => {
  return mutations.value.length
})

watch(totalMutations, (newTotal, previousTotal) => {
  if (newTotal !== previousTotal) {
    showAmount.value = 10
  }
})

type HistoryItem = {
  index: number
  mutation: PbMutation
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
        eventBus.emit('paragraph:scrollIntoView', affected)
      })
    }
  }
}

const undo = () => mutateWithLoadingState(adapter.undo())
const redo = () => mutateWithLoadingState(adapter.redo())
</script>
