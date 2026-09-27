import type { MenuLinkFragment } from '#graphql-operations'

export type MenuTree = MenuLinkFragment & { subtree?: MenuTree[] }

/**
 * The children of the menu link with the given path, e.g. the sub-pages of an
 * editorial page.
 */
export function findMenuChildren(tree: MenuTree[], path: string): MenuTree[] {
  for (const element of tree) {
    if (element.link.url?.path === path) {
      return element.subtree ?? []
    }
    const children = findMenuChildren(element.subtree ?? [], path)
    if (children.length) {
      return children
    }
  }
  return []
}
