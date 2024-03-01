<template>
  <div class="bk bk-media-library">
    <div class="bk-media-library-filters">
      <div v-for="filter in filters" :key="filter.key">
        <label v-if="filter.filter.type === 'text'" class="bk-form-text">
          <Icon name="search" />
          <input
            v-model.lazy="filterValues[filter.key]"
            type="text"
            :placeholder="filter.filter.placeholder"
          />
        </label>
        <label
          v-else-if="filter.filter.type === 'select'"
          class="bk-form-select"
        >
          <select v-model="filterValues[filter.key]">
            <option value="" disabled selected>
              {{ filter.filter.label }}
            </option>
            <option
              v-for="option in Object.entries(filter.filter.options)"
              :key="option[0]"
              :value="option[0]"
            >
              {{ option[1] }}
            </option>
          </select>
        </label>
        <label
          v-else-if="filter.filter.type === 'checkbox'"
          class="bk-checkbox-toggle"
        >
          <input v-model="filterValues[filter.key]" type="checkbox" />
          <div />
          <span>{{ filter.filter.label }}</span>
        </label>
      </div>
    </div>
    <Component
      :is="isSortli ? Sortli : 'div'"
      class="bk-media-library-items"
      :class="{ 'bk-is-sortli': isSortli }"
      no-transition
    >
      <div
        v-for="item in items"
        :key="item.mediaId"
        class="bk-media-library-items-item"
        :class="{ 'bk-is-selected': modelValue === item.mediaId }"
        :data-sortli-id="'media_library_' + item.mediaId"
        data-element-type="media_library"
        :data-item-bundle="item.blockBundle"
        :data-media-id="item.mediaId"
        :data-media-bundle="item.mediaBundle"
        @click="onClick(item.mediaId)"
      >
        <div class="bk-media-library-items-item-image">
          <img :src="item.thumbnail" />
        </div>
        <div class="bk-media-library-items-item-text">
          <h3>{{ item.label }}</h3>
          <p>{{ item.context }}</p>
        </div>
      </div>
    </Component>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, useLazyAsyncData, useBlokkli } from '#imports'
import { Sortli, Icon } from '#blokkli/components'
import type { MediaLibraryFilter } from './../types'

const props = defineProps<{
  isSortli?: boolean
  modelValue?: string
}>()

const emit = defineEmits(['update:modelValue'])

const onClick = (id: string) => {
  if (props.isSortli) {
    return
  }

  emit('update:modelValue', id)
}

type RenderedFilter = {
  key: string
  filter: MediaLibraryFilter
}

const { adapter } = useBlokkli()

const filterValues = ref<Record<string, any>>({})

const key = computed(() => Object.values(filterValues.value))

const { data } = await useLazyAsyncData(
  () => {
    return adapter.mediaLibraryGetResults!({
      filters: filterValues.value,
      page: 0,
    })
  },
  { watch: [key] },
)

const items = computed(() => data.value?.items || [])
const filters = computed<RenderedFilter[]>(() => {
  return Object.entries(data.value?.filters || {}).map(([key, filter]) => {
    return { key, filter }
  })
})
</script>
