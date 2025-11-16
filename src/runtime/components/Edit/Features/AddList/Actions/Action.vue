<template>
  <AddListItem
    :id="action.id"
    ref="item"
    :key="action.id"
    class="bk-is-action"
    context="add-list-actions"
    :label="action.title"
    :bundle="action.itemBundle"
    :icon="action.icon"
    :color="action.color"
    :disabled
    no-context-menu
  />
</template>

<script setup lang="ts">
import { AddListItem } from '#blokkli/components'
import type { AddAction } from '#blokkli/types'
import defineTourItem from '#blokkli/helpers/composables/defineTourItem'
import { computed, useTemplateRef, useBlokkli } from '#imports'

const props = defineProps<{
  action: AddAction
  selectableBundles: string[]
}>()

const { selection } = useBlokkli()

const item = useTemplateRef('item')

const bundleDisabled = computed(() => {
  if (props.action.itemBundle) {
    return !props.selectableBundles.includes(props.action.itemBundle)
  }

  return false
})

const disabled = computed(() => {
  if (bundleDisabled.value) {
    return true
  }

  if (props.action.enabled && selection.item.value) {
    return !props.action.enabled(selection.item.value)
  }

  return false
})

defineTourItem(() => {
  if (!props.action.description) {
    return
  }
  return {
    id: 'plugin:add_action:' + props.action.id,
    title: props.action.title,
    text: props.action.description,
    element: () => item.value?.getElement(),
  }
})
</script>
