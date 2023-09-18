<template>
  <SidebarInner title="Änderungen">
    <div class="pb pb-history pb-control" @mouseleave="clearAffectedTimeout">
      <ul>
        <li
          v-for="item in mapped"
          :class="{
            'is-first': item.index === mutations.length - 1,
            'is-not-active': item.index > currentIndex,
            'is-active': item.index === currentIndex,
            'is-applied': item.index < currentIndex,
          }"
        >
          <button @click="onClick(item.index)" :disabled="!editingEnabled">
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
          :class="currentIndex === -1 ? 'is-active' : 'is-applied'"
        >
          <button @click="onClick(-1)">
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
  </SidebarInner>
</template>

<script lang="ts" setup>
import SidebarInner from './../../Inner/index.vue'
import RelativeTime from './../../../RelativeTime/index.vue'
import { PbMutation } from './../../../../../types'

const props = defineProps<{
  mutations: PbMutation[]
  currentIndex: number
  editingEnabled: boolean
}>()

const emit = defineEmits<{
  (e: 'setHistoryIndex', index: number): void
}>()

const showAmount = ref(10)

const totalMutations = computed(() => {
  return props.mutations.length
})

watch(totalMutations, (newTotal, previousTotal) => {
  if (newTotal !== previousTotal) {
    showAmount.value = 10
  }
})

const mapped = computed(() => {
  return props.mutations
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

let timeout: any = null

function setAffected(uuid?: string) {
  clearAffectedTimeout()
  timeout = setTimeout(() => {
    const el = document.querySelector(`[data-uuid="${uuid}"]`)
    if (el && el instanceof HTMLElement) {
      el.classList.add('pb-item-focused')
      el.scrollIntoView({
        block: 'center',
      })
    }
  }, 100)
}

function clearAffectedTimeout() {
  clearTimeout(timeout)
  document
    .querySelectorAll('.pb-item-focused')
    .forEach((el) => el.classList.remove('pb-item-focused'))
}

function onClick(index: number) {
  if (index !== props.currentIndex) {
    emit('setHistoryIndex', index)
  }
}
</script>

<style lang="postcss"></style>
