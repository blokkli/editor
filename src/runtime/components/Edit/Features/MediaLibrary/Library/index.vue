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
    <Sortli class="bk-media-library-items" no-transition>
      <div
        v-for="item in items"
        :key="item.mediaId"
        :data-sortli-id="'media_library_' + item.mediaId"
        data-element-type="media_library"
        :data-item-bundle="item.blockBundle"
        :data-media-id="item.mediaId"
      >
        <img :src="item.thumbnail" />
        <div>
          <h3>{{ item.label }}</h3>
          <p>{{ item.context }}</p>
        </div>
      </div>
    </Sortli>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, useLazyAsyncData, useBlokkli } from '#imports'
import { Sortli, Icon } from '#blokkli/components'
import type { MediaLibraryFilter } from './../types'

type RenderedFilter = {
  key: string
  filter: MediaLibraryFilter
}

const { adapter } = useBlokkli()

const filterValues = ref<Record<string, any>>({})

const key = computed(() => Object.values(filterValues.value))

const { data } = await useLazyAsyncData(
  () => {
    console.log('Media library')
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
