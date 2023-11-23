<template>
  <li v-for="field in fields" class="pb-structure-field">
    <p class="pb-is-field">{{ field.label }}</p>
    <ul v-if="field.items">
      <li
        v-for="item in field.items"
        :class="{ 'pb-is-nested': item.isNested }"
      >
        <button
          class="pb-structure-paragraph"
          :class="{ 'pb-is-active': isSelected(item.uuid) }"
          @click="select(item.uuid)"
        >
          <div class="pb-structure-icon">
            <ParagraphIcon :bundle="item.bundle" />
          </div>
          <span>{{ item.type?.label || item.bundle }}</span>
        </button>
      </li>
    </ul>
  </li>
</template>

<script lang="ts" setup>
import { PbType } from './../../../../../types'
import ParagraphIcon from './../../../ParagraphIcon/index.vue'

const { selectedParagraphs, eventBus } = useParagraphsBuilderStore()

const uuids = computed(() => selectedParagraphs.value.map((v) => v.uuid))

const isSelected = (uuid: string) => uuids.value.includes(uuid)

const select = (uuid: string) => eventBus.emit('select', uuid)

export type StructureTreeItem = {
  uuid: string
  bundle: string
  type?: PbType
  isNested: boolean
}

export type StructureTreeField = {
  name: string
  label: string
  items?: StructureTreeItem[]
}

defineProps<{
  fields?: StructureTreeField[]
}>()
</script>
