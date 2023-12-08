<template>
  <div class="bk bk-structure bk-control">
    <ul class="bk-structure-list">
      <Field :fields="tree" />
    </ul>
  </div>
</template>

<script lang="ts" setup>
import { falsy } from '#blokkli/helpers'
import Field from './Field/index.vue'
import type { StructureTreeField, StructureTreeItem } from './types'
import { getDefinition } from '#blokkli/definitions'

const { types, state, context } = useBlokkli()

const tree = ref<StructureTreeField[]>([])

function mapItem(el: Element): StructureTreeItem | undefined {
  if (el instanceof HTMLElement) {
    const bundle = el.dataset.itemBundle || ''
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
  return [...element.children].map(mapItem).filter(falsy)
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
