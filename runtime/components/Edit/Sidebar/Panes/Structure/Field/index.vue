<template>
  <li v-for="field in fields" class="pb-structure-field">
    <h3>{{ field.name }}</h3>
    <ul v-if="field.items">
      <li v-for="item in field.items">
        <h4>{{ item.type?.label || item.bundle }}</h4>
        <Self v-if="item.fields" :fields="item.fields" />
      </li>
    </ul>
  </li>
</template>

<script lang="ts" setup>
import { PbType } from './../../../../../../types'
import Self from './index.vue'

export type StructureTreeItem = {
  uuid: string
  bundle: string
  type?: PbType
  fields?: StructureTreeField[]
}

export type StructureTreeField = {
  name: string
  items?: StructureTreeItem[]
}

defineProps<{
  fields?: StructureTreeField[]
}>()
</script>
