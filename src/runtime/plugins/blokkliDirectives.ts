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

function getInjection<T>(vnode: VNode, symbol: symbol): T | undefined {
  // @ts-expect-error Private API.
  return vnode.ctx?.provides?.[symbol]
}

function getBlokkliApp(vnode: VNode): BlokkliApp | undefined {
  return getInjection(vnode, INJECT_APP)
}

function getEntityContext(vnode: VNode): EntityContext | undefined {
  return getInjection(vnode, INJECT_ENTITY_CONTEXT)
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

      const app = getBlokkliApp(vnode)

      if (!app) {
        return
      }
      const entity = getEntityContext(vnode)
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

      const app = getBlokkliApp(vnode)

      if (!app) {
        return
      }
      const entity = getEntityContext(vnode)
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
