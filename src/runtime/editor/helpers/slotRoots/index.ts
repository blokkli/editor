import {
  cloneVNode,
  Comment,
  Fragment,
  isVNode,
  Text,
  type VNode,
  type VNodeArrayChildren,
  type VNodeChild,
} from 'vue'

type RootProps = Record<string, unknown>

/**
 * Add props to the elements at the root of what a slot rendered: `first` to the
 * first element, `others` to every other one.
 *
 * Comments and text are skipped, and fragments gone into (`<template v-if>`,
 * `v-for`). A component counts as an element: its root gets the props through
 * fallthrough, if it has a single one.
 *
 * Returns new nodes and arrays; the slot's stay as they are. The nodes must come
 * from calling the slot function in a render function, not from `<slot>`:
 * there, Vue tracks the slot's dynamic children, and an update would patch the
 * vnodes that were cloned instead of the clones.
 */
export function withRootProps(
  nodes: VNode[],
  first: RootProps,
  others: RootProps,
): VNode[] {
  let hasFirst = false

  function visit(child: VNodeChild): VNodeChild {
    if (Array.isArray(child)) {
      return child.map(visit) as VNodeArrayChildren
    }

    if (!isVNode(child) || child.type === Comment || child.type === Text) {
      return child
    }

    if (child.type === Fragment) {
      const clone = cloneVNode(child)
      if (Array.isArray(child.children)) {
        clone.children = child.children.map(visit) as VNodeArrayChildren
      }
      return clone
    }

    const props = hasFirst ? others : first
    hasFirst = true
    return cloneVNode(child, props)
  }

  return nodes.map((node) => visit(node) as VNode)
}
