<template>
  <div class="bk-library bk-control">
    <div class="bk-library-form">
      <input
        v-model="text"
        type="text"
        id="library_search"
        class="bk-form-input"
        placeholder="Suchbegriff"
        required
      />
    </div>
    <div v-if="data" class="bk-library-list" ref="listEl">
      <Item
        v-for="item in data"
        v-bind="item"
        v-show="visible === null || visible.includes(item.uuid)"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { Sortable } from '#blokkli/sortable'
import Item from './Item/index.vue'
import { BlokkliLibraryItem } from '#blokkli/types'
import { falsy } from '#blokkli/helpers'

const { adapter, eventBus } = useBlokkli()

const listEl = ref<HTMLDivElement | null>(null)
const text = ref('')
let instance: Sortable | null = null

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

onMounted(() => {
  if (listEl.value) {
    instance = new Sortable(listEl.value, {
      sort: false,
      group: {
        name: 'types',
        put: false,
        pull: 'clone',
        revertClone: false,
      },
      forceFallback: true,
      onStart(e) {
        const rect = e.item.getBoundingClientRect()
        const originalEvent = (e as any).originalEvent || ({} as PointerEvent)
        eventBus.emit('dragging:start', {
          rect,
          offsetX: originalEvent.clientX,
          offsetY: originalEvent.clientY,
        })
      },
      onEnd() {
        eventBus.emit('dragging:end')
      },
      animation: 300,
    })
  }
})

onUnmounted(() => {
  if (instance) {
    instance.destroy()
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
