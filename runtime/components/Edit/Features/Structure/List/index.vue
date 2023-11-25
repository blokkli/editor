<template>
  <div class="pb pb-structure pb-control">
    <ul class="pb-structure-list">
      <Field :fields="tree" />
    </ul>
  </div>
</template>

<script lang="ts" setup>
import { falsy } from '../../../helpers'
import Field, { StructureTreeItem, StructureTreeField } from './Field/index.vue'

const { allTypes, refreshKey, entityUuid } = useParagraphsBuilderStore()

const tree = ref<StructureTreeField[]>([])

function mapItem(el: Element): StructureTreeItem | undefined {
  if (el instanceof HTMLElement) {
    const bundle = el.dataset.paragraphType || ''
    return {
      uuid: el.dataset.uuid || '',
      bundle,
      type: allTypes.value.find((v) => v.id === bundle),
      items: [...el.querySelectorAll('[data-uuid]')].map(mapItem).filter(falsy),
    }
  }
}

function buildItemsForField(element: HTMLElement): StructureTreeItem[] {
  const paragraphs = element.children
  return [...paragraphs].map(mapItem).filter(falsy)
}

function buildTree() {
  const fields = document.body.querySelectorAll(
    `[data-host-entity-uuid="${entityUuid}"]`,
  )
  tree.value = [...fields]
    .map((field) => {
      if (field instanceof HTMLElement) {
        return {
          name: field.dataset.fieldName || '',
          label: field.dataset.fieldLabel || '',
          items: buildItemsForField(field),
        }
      }
    })
    .filter(falsy)
}

buildTree()

watch(refreshKey, () => buildTree())
</script>
