<template>
  <Sidebar title="Bibliothek">
    <div class="pb-library pb-control">
      <!-- <div class="pb-library-form"> -->
      <!--   <label for="library_search" class="pb-form-label">Suchbegriff</label> -->
      <!--   <input -->
      <!--     v-model="text" -->
      <!--     type="text" -->
      <!--     id="library_search" -->
      <!--     class="pb-form-input" -->
      <!--     placeholder="" -->
      <!--     required -->
      <!--   /> -->
      <!-- </div> -->
      <div v-if="data" class="pb-library-list" ref="listEl">
        <Item v-for="item in data" v-bind="item" />
      </div>
    </div>
  </Sidebar>
</template>

<script lang="ts" setup>
import { falsy } from '../../../helpers'
import Sortable from 'sortablejs'
import Sidebar from './../../Inner/index.vue'
import Item, { ReusableItem } from './Item/index.vue'

const listEl = ref<HTMLDivElement | null>(null)
const text = ref('')
let instance: Sortable | null = null

const { data } = await useAsyncData<ReusableItem[]>(() => {
  return useGraphqlQuery('paragraphsBuilderLibraryItems').then((response) => {
    return (
      response.data.entityQuery.items
        ?.map((v) => {
          if (v && 'id' in v && v.id) {
            const paragraph = v.paragraphs?.list?.[0]
            const bundle = paragraph?.item?.entityBundle
            if (bundle && paragraph && paragraph.paragraph && paragraph.item) {
              return {
                id: v.id,
                label: v.label,
                bundle,
                item: paragraph.item,
                paragraph: paragraph.paragraph,
              }
            }
          }
        })
        .filter(falsy) || []
    )
  })
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
      animation: 300,
    })
  }
})
onUnmounted(() => {
  if (instance) {
    instance.destroy()
  }
})
</script>

<style lang="postcss"></style>
