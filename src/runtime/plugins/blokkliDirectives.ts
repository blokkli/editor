import type { BlokkliApp } from '#blokkli/editor/types/app'
import { fromLibraryBlockBundle, itemEntityType } from '#blokkli-build/config'
import {
  findSlotItem,
  resolveDirectiveEntity,
} from '#blokkli/helpers/directiveEntity'
import {
  INJECT_APP,
  INJECT_ENTITY_CONTEXT,
  INJECT_IS_OUTSIDE_STATE,
} from '#blokkli/helpers/injections'
import type { EntityContext } from '#blokkli/types'
import type { BlokkliDirectiveType } from '#blokkli/types/directives'
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

/**
 * The entity whose field the directive edits. The markup that the slot of a
 * field in proxy mode ties to one of its blocks is that block's, though its
 * template is the one of the block holding the field.
 */
function getDirectiveEntity(
  vnode: VNode,
  el: HTMLElement,
  app: BlokkliApp,
): EntityContext | null {
  return resolveDirectiveEntity({
    owner: getEntityContext(vnode, el),
    slotItem: findSlotItem(el),
    getHostUuid: (uuid) => app.state.getFieldListForBlock(uuid)?.entityUuid,
    getBundle: (uuid) => app.state.getFieldListItem(uuid)?.bundle,
    itemEntityType,
    fromLibraryBundle: fromLibraryBlockBundle,
  })
}

function isOutsideState(vnode: VNode): boolean {
  return !!getInjection(vnode, INJECT_IS_OUTSIDE_STATE)
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

  // The registrations of this directive, by element.
  const registered = new WeakMap<
    HTMLElement,
    { app: BlokkliApp; fieldName: string; entity: EntityContext }
  >()

  return {
    created(el, binding, vnode) {
      if (import.meta.client) {
        if (!isEditing()) {
          return
        }

        if (isOutsideState(vnode)) {
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
      if (isOutsideState(vnode)) {
        return
      }

      const app = getBlokkliApp(vnode, el)

      if (!app) {
        return
      }
      const fieldName = getFieldName(binding)
      if (!fieldName) {
        return
      }
      const entity = getDirectiveEntity(vnode, el, app)
      if (!entity) {
        return
      }

      app.directive.registerDirectiveElement(el, fieldName, entity, type, false)
      registered.set(el, { app, fieldName, entity })
    },
    beforeUnmount(el: HTMLElement) {
      // What it registered: finding the entity again would need the element
      // still in its place, and the field name may have changed.
      const registration = registered.get(el)
      if (!registration) {
        return
      }
      registered.delete(el)
      registration.app.directive.unregisterDirectiveElement(
        el,
        registration.fieldName,
        registration.entity,
        type,
      )
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
