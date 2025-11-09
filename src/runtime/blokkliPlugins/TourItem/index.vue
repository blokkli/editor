<template>
  <slot />
</template>

<script lang="ts" setup>
import defineTourItem from '#blokkli/helpers/composables/defineTourItem'
import { getCurrentInstance, useBlokkli } from '#imports'

import type { RendererNode } from 'vue'

const props = defineProps<{
  id: string
  title: string
  text: string
  selector?: string
  element?: HTMLElement | null
}>()

const { element: elementProvider } = useBlokkli()

const findInstanceElement = (
  el: RendererNode | null | undefined,
): HTMLElement | undefined => {
  if (el instanceof Text) {
    return findInstanceElement(el.nextElementSibling)
  } else if (el instanceof HTMLElement) {
    return el
  }
}

const instance = getCurrentInstance()

function getElement() {
  if (props.element) {
    return props.element
  }
  if (props.selector) {
    const match = elementProvider.query(
      document.documentElement,
      props.selector,
      `TourItem Plugin: ${props.id}`,
    )

    if (match) {
      return match
    }
  }

  return findInstanceElement(instance?.vnode.el)
}

defineTourItem(() => {
  return {
    id: props.id,
    title: props.title,
    text: props.text,
    element: () => {
      return getElement()
    },
  }
})
</script>
