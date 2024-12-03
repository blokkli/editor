<template>
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
</template>

<script setup lang="ts">
import { ref, computed, useBlokkli, watch } from '#imports'
import { RelativeTime, Icon } from '#blokkli/components'
import type { MutationItem } from '#blokkli/types'

defineProps<{
  scrolledToEnd: boolean
}>()

const { state, $t, adapter } = useBlokkli()

const { mutations, currentMutationIndex, canEdit, mutateWithLoadingState } =
  state

const canSetStatus = !!adapter.setMutationItemStatus

const showAmount = ref(50)
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
  if (!adapter.setHistoryIndex) {
    return
  }
  if (index !== currentMutationIndex.value) {
    await mutateWithLoadingState(() => adapter.setHistoryIndex!(index))
  }
}

async function setMutationItemStatus(index: number, status: boolean) {
  if (!adapter.setMutationItemStatus) {
    return
  }
  await mutateWithLoadingState(() =>
    adapter.setMutationItemStatus!(index, status),
  )
}
</script>
