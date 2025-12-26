<template>
  <slot />
</template>

<script lang="ts" setup>
import { getCurrentInstance, useBlokkli } from '#imports'

import type { RendererNode } from 'vue'
import { defineTourItem } from '#blokkli/editor/composables'

const props = defineProps<{
  /**
   * Unique identifier for this tour item.
   */
  id: string

  /**
   * The title of the tour step.
   */
  title: string

  /**
   * The description text explaining this feature.
   *
   * Supports markdown.
   */
  text: string

  /**
   * Optional CSS selector to find the target element.
   *
   * If provided, the tour will highlight this element.
   */
  selector?: string

  /**
   * Optional direct reference to the target element.
   *
   * Takes precedence over selector.
   */
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
