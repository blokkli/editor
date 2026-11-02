import { defineAsyncComponent } from '#imports'
import type { Component, HydrationStrategy } from 'vue'

const neverHydrate: HydrationStrategy = () => {}

/**
 * Returns the component wrapped so that Vue keeps its server-rendered HTML
 * and never hydrates it. When its props change, Vue renders it after all.
 *
 * Call it once per rendered block, on the server too. Vue can only update a
 * block it didn't hydrate when the wrapper had not loaded yet while
 * hydrating: a shared wrapper would throw on the update of every block after
 * the first. And the wrapper is an async boundary, which useId() counts:
 * without it on the server, later ids differ from the server's.
 */
export function withoutHydration(component: Component): Component {
  return defineAsyncComponent({
    loader: () => Promise.resolve(component),
    hydrate: neverHydrate,
  })
}
