import { chunks, chunkMapping } from '#blokkli-build/imports'
import type { Component } from 'vue'
import { defineAsyncComponent } from '#imports'

function objectOrImport(
  key: string,
): Component | Promise<() => Component> | undefined {
  const chunkName = chunkMapping[key]
  if (!chunkName) {
    return
  }

  const chunkEntry = chunks[chunkName]

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

export function getComponent(
  type: 'block' | 'fragment',
  bundle: string,
  fieldListType?: string,
  parentBundle?: string,
): any {
  if (fieldListType) {
    const key = `${type}:${bundle}__f:${fieldListType}`
    if (chunkMapping[key]) {
      return objectOrImport(key)
    }
  }
  if (parentBundle) {
    const key = `${type}:${bundle}__p:${parentBundle}`
    if (chunkMapping[key]) {
      return objectOrImport(key)
    }
  }
  const key = `${type}:${bundle}`
  return objectOrImport(key)
}
