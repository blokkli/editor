<template>
  <div class="bk-library bk-control">
    <div class="bk-library-form">
      <input
        id="library_search"
        v-model="text"
        type="text"
        class="bk-form-input"
        placeholder="Suchbegriff"
        required
      />
    </div>
    <Sortli v-if="data" ref="listEl" class="bk-library-list">
      <Item
        v-for="item in data"
        v-show="visible === null || visible.includes(item.uuid)"
        :key="item.uuid"
        :data-sortli-id="item.uuid"
        v-bind="item"
      />
    </Sortli>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, useBlokkli, watch, useAsyncData } from '#imports'
import { Sortli } from '#blokkli/components'
import Item from './Item/index.vue'
import type { BlokkliLibraryItem } from '#blokkli/types'
import { falsy } from '#blokkli/helpers'

const { adapter } = useBlokkli()

const listEl = ref<HTMLDivElement | null>(null)
const text = ref('')

type SearchElement = {
  uuid: string
  text: string
}

const elements = ref<SearchElement[]>([])

const buildElements = () => {
  if (!listEl.value) {
    return
  }
  elements.value = [...listEl.value.querySelectorAll('.bk-library-list-item')]
    .map((el) => {
      if (el instanceof HTMLElement) {
        const uuid = el.dataset.libraryItemUuid
        if (uuid) {
          return {
            uuid,
            text: el.innerText.toLowerCase(),
          }
        }
      }
    })
    .filter(falsy)
}

const { data } = await useAsyncData<BlokkliLibraryItem[]>(() =>
  adapter.getLibraryItems(),
)

watch(text, () => {
  if (!elements.value.length) {
    buildElements()
  }
})

const visible = computed<string[] | null>(() => {
  if (!text.value || !elements.value.length) {
    return null
  }

  return elements.value
    .filter((v) => v.text.includes(text.value.toLowerCase()))
    .map((v) => v.uuid)
})
</script>

<style lang="postcss"></style>
