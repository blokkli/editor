import { defineAsyncComponent } from '#imports'
import type { Component, HydrationStrategy } from 'vue'

const never: HydrationStrategy = () => {}

/**
 * Returns the component wrapped so that Vue keeps its server-rendered HTML
 * and never hydrates it. When its props change, Vue renders it after all.
 *
 * Call it once per rendered block. Vue can only update a block it didn't
 * hydrate when the wrapper had not loaded yet while hydrating; a shared
 * wrapper would throw on the update of every block after the first.
 */
export function withoutHydration(component: Component): Component {
  return defineAsyncComponent({
    loader: () => Promise.resolve(component),
    hydrate: never,
  })
}
