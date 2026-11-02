import { chunks, chunkMapping, hydrationMapping } from '#blokkli-build/imports'
import type { Component } from 'vue'
import { defineAsyncComponent } from '#imports'
import { withoutHydration } from './hydration'
import type {
  ValidFieldListTypes,
  ValidProviderTypes,
} from '#blokkli-build/generated-types'

function objectOrImport(
  key: string,
  applyHydration?: boolean,
): Component | undefined {
  const component = load(key)
  return component && applyHydration && hydrationMapping[key] === 'never'
    ? withoutHydration(component)
    : component
}

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
   * Apply the block's "hydrate" setting. Only while hydrating a page rendered
   * on the server: the editor needs every block hydrated.
   */
  applyHydration?: boolean
}

export function getComponent(
  type: 'block' | 'fragment',
  bundleOrFragmentName: string,
  context: GetComponentContext,
  allComponents?: Record<string, Component> | null,
): any {
  if (context.providerType) {
    const key = `${type}:${bundleOrFragmentName}__t:${context.providerType}`
    if (allComponents && allComponents[key]) {
      return allComponents[key]
    }
    if (chunkMapping[key]) {
      return objectOrImport(key, context.applyHydration)
    }
  }

  if (context.fieldListType) {
    const key = `${type}:${bundleOrFragmentName}__f:${context.fieldListType}`
    if (allComponents && allComponents[key]) {
      return allComponents[key]
    }
    if (chunkMapping[key]) {
      return objectOrImport(key, context.applyHydration)
    }
  }

  if (context.parentBundle) {
    const key = `${type}:${bundleOrFragmentName}__p:${context.parentBundle}`
    if (allComponents && allComponents[key]) {
      return allComponents[key]
    }
    if (chunkMapping[key]) {
      return objectOrImport(key, context.applyHydration)
    }
  }

  const key = `${type}:${bundleOrFragmentName}`
  if (allComponents && allComponents[key]) {
    return allComponents[key]
  }
  return objectOrImport(key, context.applyHydration)
}
