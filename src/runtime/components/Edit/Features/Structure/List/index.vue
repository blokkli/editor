<template>
  <div class="bk bk-structure bk-control" tabindex="1" @keydown="onKeydown">
    <ul class="bk-structure-list">
      <Field :fields="tree" />
    </ul>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, useBlokkli, ref, nextTick } from '#imports'
import { falsy } from '#blokkli/helpers'
import Field from './Field/index.vue'
import type { StructureTreeField, StructureTreeItem } from './types'
import { getDefaultDefinition } from '#blokkli/definitions'

const { types, context, eventBus } = useBlokkli()

const tree = ref<StructureTreeField[]>([])

const onKeydown = (e: KeyboardEvent) => {
  if (e.code === 'Tab') {
    return
  }
  if (e.code === 'ArrowUp') {
    e.stopPropagation()
    e.preventDefault()
    eventBus.emit('select:previous')
  } else if (e.code === 'ArrowDown') {
    e.stopPropagation()
    e.preventDefault()
    eventBus.emit('select:next')
  }
}

function mapItem(el: Element): StructureTreeItem | undefined {
  if (el instanceof HTMLElement) {
    const bundle = el.dataset.itemBundle || ''
    const definition = getDefaultDefinition(bundle)
    const title = definition?.editor?.editTitle
      ? definition.editor.editTitle(el)
      : undefined
    return {
      uuid: el.dataset.uuid || '',
      bundle,
      type: types.getBlockBundleDefinition(bundle),
      items: [...el.querySelectorAll('[data-uuid]')].map(mapItem).filter(falsy),
      title: title || undefined,
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

onMounted(() => {
  buildTree()

  nextTick(() => {
    // Scroll the active element into view.
    const el = document.querySelector(
      '.bk-structure-field-items li.bk-is-active',
    )
    if (el instanceof HTMLElement) {
      el.scrollIntoView({ block: 'center', behavior: 'instant' })
    }
  })
})
</script>
