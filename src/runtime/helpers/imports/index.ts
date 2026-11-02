import { chunks, chunkMapping, hydrationMapping } from '#blokkli-build/imports'
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

  /**
   * Apply the block's "hydrate" setting. Only when rendering on the server
   * and while hydrating what it rendered: the editor needs every block.
   */
  applyHydration?: boolean
}

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
      return loadForRendering(key, context.applyHydration)
    }
  }

  return allComponents?.[base] ?? loadForRendering(base, context.applyHydration)
}

function loadForRendering(
  key: string,
  applyHydration?: boolean,
): Component | undefined {
  const component = load(key)
  return component && applyHydration && hydrationMapping[key] === 'never'
    ? withoutHydration(component)
    : component
}
