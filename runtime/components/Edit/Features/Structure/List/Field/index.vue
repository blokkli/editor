<template>
  <li v-for="field in fields" class="pb-structure-field" :key="field.name">
    <p class="pb-is-field">{{ field.label }}</p>
    <ul v-if="field.items?.length" class="pb-structure-field-paragraphs">
      <li
        v-for="item in field.items"
        :key="item.uuid"
        :class="{ 'pb-is-active': isSelected(item.uuid) }"
      >
        <button class="pb-paragraph-label" @click="select(item.uuid)">
          <div class="pb-paragraph-label-icon">
            <ParagraphIcon :bundle="item.bundle" />
          </div>
          <span>{{ item.type?.label || item.bundle }}</span>
        </button>
        <ul
          v-if="item.items?.length"
          class="pb-structure-field-nested-paragraphs"
        >
          <li
            v-for="child in item.items"
            :key="child.uuid"
            class="pb-parent"
            :class="{
              'pb-is-active': isSelected(child.uuid),
              'pb-is-inside-active': isSelected(item.uuid),
            }"
          >
            <button class="pb-paragraph-label" @click="select(child.uuid)">
              <div class="pb-paragraph-label-icon">
                <ParagraphIcon :bundle="child.bundle" />
              </div>
              <span>{{ child.type?.label || child.bundle }}</span>
            </button>
          </li>
        </ul>
      </li>
    </ul>
  </li>
</template>

<script lang="ts" setup>
import { PbType } from './../../../../../../types'
import ParagraphIcon from './../../../../ParagraphIcon/index.vue'

const { selectedParagraphs, eventBus } = useParagraphsBuilderStore()

const uuids = computed(() => selectedParagraphs.value.map((v) => v.uuid))

const isSelected = (uuid: string) => uuids.value.includes(uuid)

const select = (uuid: string) => {
  eventBus.emit('select', uuid)
  eventBus.emit('paragraph:scrollIntoView', uuid)
}

export type StructureTreeItem = {
  uuid: string
  bundle: string
  type?: PbType
  items?: StructureTreeItem[]
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
