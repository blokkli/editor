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

function buildItemsForField(element: HTMLElement): StructureTreeItem[] {
  const paragraphs = element.querySelectorAll(
    `[data-provider-uuid="${entityUuid}"] [data-uuid]`,
  )
  return [...paragraphs]
    .map((child) => {
      if (child instanceof HTMLElement) {
        const bundle = child.dataset.paragraphType || ''
        return {
          uuid: child.dataset.uuid || '',
          bundle,
          type: allTypes.value.find((v) => v.id === bundle),
          isNested: child.dataset.hostType === 'paragraph',
        }
      }
    })
    .filter(falsy)
}

function buildTree() {
  const fields = document.body.querySelectorAll(
    '.pb-field-paragraphs[data-field-is-nested="false"]',
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
