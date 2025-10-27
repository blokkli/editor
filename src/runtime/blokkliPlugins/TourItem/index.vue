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
}>()

const { element } = useBlokkli()

const findElement = (
  el: RendererNode | null | undefined,
): HTMLElement | undefined => {
  if (el instanceof Text) {
    return findElement(el.nextElementSibling)
  } else if (el instanceof HTMLElement) {
    return el
  }
}

const instance = getCurrentInstance()

defineTourItem(() => {
  return {
    id: props.id,
    title: props.title,
    text: props.text,
    element: () => {
      const provided = props.selector
        ? element.query(
            document.documentElement,
            props.selector,
            `TourItem Plugin: ${props.id}`,
          )
        : undefined
      const el = provided || findElement(instance?.vnode.el)
      if (el instanceof HTMLElement) {
        return el
      }
    },
  }
})
</script>
