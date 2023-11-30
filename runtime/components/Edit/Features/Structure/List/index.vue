<template>
  <div class="pb pb-structure pb-control">
    <ul class="pb-structure-list">
      <Field :fields="tree" />
    </ul>
  </div>
</template>

<script lang="ts" setup>
import { falsy } from '#pb/helpers'
import Field, { StructureTreeItem, StructureTreeField } from './Field/index.vue'
import { getDefinition } from '#nuxt-paragraphs-builder/definitions'

const { types, state, context } = useBlokkli()

const tree = ref<StructureTreeField[]>([])

function mapItem(el: Element): StructureTreeItem | undefined {
  if (el instanceof HTMLElement) {
    const bundle = el.dataset.paragraphType || ''
    const definition = getDefinition(bundle)
    const title =
      definition && definition.editTitle ? definition.editTitle(el) : undefined
    return {
      uuid: el.dataset.uuid || '',
      bundle,
      type: types.allTypes.value.find((v) => v.id === bundle),
      items: [...el.querySelectorAll('[data-uuid]')].map(mapItem).filter(falsy),
      title,
    }
  }
}

function buildItemsForField(element: HTMLElement): StructureTreeItem[] {
  const paragraphs = element.children
  return [...paragraphs].map(mapItem).filter(falsy)
}

function buildTree() {
  const fields = document.body.querySelectorAll(
    `[data-host-entity-uuid="${context.value.entityUuid}"]`,
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

watch(state.refreshKey, () => buildTree())

onMounted(() => {
  buildTree()
})
</script>
