import { chunks, chunkMapping } from '#blokkli-build/imports'
import type { Component } from 'vue'
import { defineAsyncComponent } from '#imports'
import type {
  ValidFieldListTypes,
  ValidProviderTypes,
} from '#blokkli-build/generated-types'

function objectOrImport(
  key: string,
): Component | Promise<() => Component> | undefined {
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
      return objectOrImport(key)
    }
  }

  if (context.fieldListType) {
    const key = `${type}:${bundleOrFragmentName}__f:${context.fieldListType}`
    if (allComponents && allComponents[key]) {
      return allComponents[key]
    }
    if (chunkMapping[key]) {
      return objectOrImport(key)
    }
  }

  if (context.parentBundle) {
    const key = `${type}:${bundleOrFragmentName}__p:${context.parentBundle}`
    if (allComponents && allComponents[key]) {
      return allComponents[key]
    }
    if (chunkMapping[key]) {
      return objectOrImport(key)
    }
  }

  const key = `${type}:${bundleOrFragmentName}`
  if (allComponents && allComponents[key]) {
    return allComponents[key]
  }
  return objectOrImport(key)
}
