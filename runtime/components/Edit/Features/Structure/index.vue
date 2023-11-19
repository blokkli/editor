<template>
  <PluginSidebar id="structure" title="Struktur" edit-only>
    <template #icon>
      <Icon />
    </template>
    <div class="pb pb-structure pb-control">
      <ul class="pb-structure-list">
        <Field :fields="tree" />
      </ul>
    </div>
  </PluginSidebar>
</template>

<script lang="ts" setup>
import PluginSidebar from './../../Plugin/Sidebar/index.vue'
import Icon from './../../Icons/Tree.vue'
import { falsy } from '../../helpers'
import Field, { StructureTreeItem, StructureTreeField } from './Field/index.vue'

const { allTypes } = useParagraphsBuilderStore()

function buildItemsForField(element: HTMLElement): StructureTreeItem[] {
  const paragraphs = element.querySelectorAll('[data-uuid]')
  return [...paragraphs]
    .map((child) => {
      if (child instanceof HTMLElement) {
        const bundle = child.dataset.paragraphType || ''
        return {
          uuid: child.dataset.uuid || '',
          bundle,
          type: allTypes.value.find((v) => v.id === bundle),
          fields: buildTreeForField(child),
        }
      }
    })
    .filter(falsy)
}

function buildTreeForField(
  element: HTMLElement,
  isRoot?: boolean,
): StructureTreeField[] {
  const fields = isRoot
    ? element.querySelectorAll(
        '.pb-field-paragraphs[data-field-is-nested="false"]',
      )
    : element.querySelectorAll('.pb-field-paragraphs')
  return [...fields]
    .map((field) => {
      if (field instanceof HTMLElement) {
        return {
          name: field.dataset.fieldName || '',
          items: buildItemsForField(field),
        }
      }
    })
    .filter(falsy)
}

const tree = computed(() => {
  return buildTreeForField(document.body, true)
})
</script>
