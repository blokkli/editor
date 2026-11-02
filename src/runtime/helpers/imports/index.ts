import { chunks, chunkMapping, neverHydrated } from '#blokkli-build/imports'
import type { Component } from 'vue'
import { defineAsyncComponent } from '#imports'
import { withoutHydration } from './hydration'
import type {
  ValidFieldListTypes,
  ValidProviderTypes,
} from '#blokkli-build/generated-types'

function load(key: string): Component | undefined {
  const chunkName = chunkMapping[key]
  if (!chunkName) {
    return
  }

  const chunkEntry = chunks[chunkName]
  if (!chunkEntry) {
    return
  }

  if (typeof chunkEntry === 'function') {
    return defineAsyncComponent(() =>
      chunkEntry().then((group) => {
        const item = group[key]
        if (item && 'loadComponent' in item) {
          return item.loadComponent()
        }
        return item
      }),
    )
  }

  const item = chunkEntry[key]
  if (item && 'loadComponent' in item) {
    return defineAsyncComponent(() => item.loadComponent())
  }

  return item
}

type GetComponentContext = {
  fieldListType?: ValidFieldListTypes
  parentBundle?: string
  providerType?: ValidProviderTypes
}

/**
 * Call it in setup, once per rendered block, and render the result as the
 * root: a block that is never hydrated gets its own wrapper (hydration.ts).
 */
export function getComponent(
  type: 'block' | 'fragment',
  bundleOrFragmentName: string,
  context: GetComponentContext,
  allComponents?: Record<string, Component> | null,
): any {
  const base = `${type}:${bundleOrFragmentName}`
  const variations = [
    context.providerType && `${base}__t:${context.providerType}`,
    context.fieldListType && `${base}__f:${context.fieldListType}`,
    context.parentBundle && `${base}__p:${context.parentBundle}`,
  ].filter((key): key is string => !!key)

  for (const key of variations) {
    if (allComponents?.[key]) {
      return allComponents[key]
    }
    if (chunkMapping[key]) {
      return loadForRendering(key)
    }
  }

  return allComponents?.[base] ?? loadForRendering(base)
}

/**
 * The editor's components (allComponents) are never wrapped: they always
 * hydrate. Outside of hydration, Vue renders the wrapper as usual.
 */
function loadForRendering(key: string): Component | undefined {
  const component = load(key)
  return component && neverHydrated.has(key)
    ? withoutHydration(component)
    : component
}
