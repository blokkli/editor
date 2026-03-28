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
            <Icon name="bk_mdi_close" />
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
import { RelativeTime, Icon } from '#blokkli/editor/components'
import type { MutationItem } from '#blokkli/editor/types/state'

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

<style lang="postcss">
.bk {
  &.bk-history {
    .bk-history-load-more {
      @apply h-[70px] pt-10;
      button {
        &:before {
          @apply hidden;
        }
        &:after {
          content: '';
          @apply absolute h-40 w-0 border-l-[8px] top-0 left-2 z-50 border-mono-400;
          border-style: dotted;
        }
      }
      > button {
        @apply w-full;
      }

      &:hover {
        button:after {
          @apply border-accent-700;
        }
      }
    }
    .bk-history-empty-message {
      @apply p-20;
    }
    ul {
      @apply relative;
      @apply pt-15;
      li {
        @apply relative pl-20;
        &:after {
          content: '';
          @apply absolute w-0 left-[25.5px] top-0 h-full;
          @apply border-l border-mono-300 border-dashed;
          @apply translate-y-20;
          @apply pointer-events-none;
          z-index: 1;
        }
        &.bk-is-last {
          @apply sticky bg-white bottom-0 z-50 py-15;
          &.bk-has-shadow {
            box-shadow: 0 -2px 12px theme('colors.mono.300');
          }
        }
        &.bk-is-last:after {
          @apply top-0 h-1/2 translate-y-0;
        }
        &.bk-is-active ~ li:after,
        &.bk-is-active:after {
          @apply border-solid border-mono-400;
        }

        &.bk-is-not-active .bk-history-item-button {
          @apply text-mono-400;
          em {
            @apply text-mono-400;
          }
          &:before {
            @apply text-mono-300 scale-50;
          }
        }
        &.bk-is-disabled .bk-history-item-button {
          @apply text-red-normal/50 line-through pointer-events-none;
          em {
            @apply text-red-normal/50;
          }
          &:before {
            @apply text-mono-300 scale-50;
          }
        }
        &.bk-is-active {
          .bk-history-item-button {
            &:before {
              @apply bg-accent-800 scale-100;
            }
          }
        }

        &.bk-is-applied .bk-history-item-button {
          &:before {
            @apply border-accent-200 bg-accent-200;
          }
        }
        &:not(.bk-is-active) .bk-history-item-button {
          &:hover {
            @apply text-accent-800;
            &:before {
              @apply bg-accent-400;
            }
          }
        }
        &:hover {
          .bk-history-item-actions {
            @apply block;
          }
        }
      }
      .bk-history-item-button {
        @apply text-left w-full block relative py-10 text-sm cursor-pointer pl-[22px] text-black;

        > div {
          @apply pointer-events-none;
        }

        &[disabled] {
          @apply pointer-events-none;
        }

        &:before {
          content: '';
          @apply absolute -top-[8px] left-[-1px] w-15 h-15 bg-mono-200 rounded-full z-10;
          @apply transition-all translate-y-20;
          box-shadow: 0 0 0 3px white;
        }

        strong {
          @apply text-sm font-semibold;
        }
        em {
          @apply text-mono-500 text-xs not-italic;
        }
      }
    }

    .bk-history-item-actions {
      @apply absolute right-15 top-1/2 -translate-y-1/2 hidden;

      button {
        @apply rounded-full p-3;
        svg {
          @apply fill-mono-500 size-20;
        }

        &:hover {
          @apply bg-red-normal;
          svg {
            @apply fill-white;
          }
        }
      }
    }
  }
}
</style>
