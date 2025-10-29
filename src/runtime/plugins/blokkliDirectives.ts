import {
  INJECT_APP,
  INJECT_ENTITY_CONTEXT,
  INJECT_IS_IN_REUSABLE,
} from '#blokkli/helpers/symbols'
import type {
  BlokkliApp,
  BlokkliDirectiveType,
  EntityContext,
} from '#blokkli/types'
import { defineNuxtPlugin, type DirectiveBinding, type VNode } from '#imports'
import type { ObjectDirective } from 'vue'

function getInjectionFromProviderElement<T>(
  symbol: symbol,
  el?: HTMLElement,
): T | undefined {
  if (!el) {
    return
  }

  // Fallback: Find the closest provider element and get the BlokkliApp instance from it.
  // This is needed when the directive is used in a component that is not a descendant
  // of EditProvider in the component tree (e.g., in the page component that renders BlokkliProvider).
  const providerEl = el.closest('[data-blokkli-provider-active]')

  if (!(providerEl instanceof HTMLElement)) {
    return
  }

  // @ts-expect-error Custom property
  return providerEl[symbol]
}

function getInjection<T>(
  vnode: VNode,
  symbol: symbol,
  el?: HTMLElement,
): T | undefined {
  return (
    // @ts-expect-error Private API.
    vnode.ctx?.provides?.[symbol] ?? getInjectionFromProviderElement(symbol, el)
  )
}

function getBlokkliApp(vnode: VNode, el: HTMLElement): BlokkliApp | undefined {
  return getInjection<BlokkliApp>(vnode, INJECT_APP, el)
}

function getEntityContext(
  vnode: VNode,
  el: HTMLElement,
): EntityContext | undefined {
  return getInjection<EntityContext>(vnode, INJECT_ENTITY_CONTEXT, el)
}

function isInReusable(vnode: VNode): boolean {
  return !!getInjection(vnode, INJECT_IS_IN_REUSABLE)
}

function getFieldName(
  binding: DirectiveBinding<any, string, any>,
): string | undefined {
  const fieldName = binding.value?.name || binding.arg
  if (fieldName && typeof fieldName === 'string') {
    return fieldName
  }
}

function isEditing(): boolean {
  if (import.meta.client) {
    return window.location.search.includes('blokkliEditing')
  }
  return false
}

function createDirective(
  type: BlokkliDirectiveType,
): ObjectDirective<HTMLElement, 'name'> {
  const dataset =
    type === 'editable' ? 'blokkliEditableField' : 'blokkliDroppableField'
  return {
    created(el, binding, vnode) {
      if (import.meta.client) {
        if (!isEditing()) {
          return
        }

        if (isInReusable(vnode)) {
          return
        }

        const fieldName = getFieldName(binding)
        if (!fieldName) {
          return
        }

        el.dataset[dataset] = fieldName
      }
    },
    mounted(el, binding, vnode) {
      if (!isEditing()) {
        return
      }
      if (isInReusable(vnode)) {
        return
      }

      const app = getBlokkliApp(vnode, el)

      if (!app) {
        return
      }
      const entity = getEntityContext(vnode, el)
      if (!entity) {
        return
      }
      const fieldName = getFieldName(binding)
      if (!fieldName) {
        return
      }

      app.directive.registerDirectiveElement(el, fieldName, entity, type)
    },
    beforeUnmount(el: HTMLElement, binding, vnode) {
      if (!isEditing()) {
        return
      }

      const app = getBlokkliApp(vnode, el)

      if (!app) {
        return
      }
      const entity = getEntityContext(vnode, el)
      if (!entity) {
        return
      }
      const fieldName = getFieldName(binding)
      if (!fieldName) {
        return
      }

      app.directive.unregisterDirectiveElement(el, fieldName, entity, type)
    },
  }
}

export default defineNuxtPlugin({
  name: 'blokkli:directives',
  setup(nuxtApp) {
    nuxtApp.vueApp.directive('blokkli-editable', createDirective('editable'))
    nuxtApp.vueApp.directive('blokkli-droppable', createDirective('droppable'))
  },
})
