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

/**
 * The sub-pages of an editorial page: its children in the menu, with their
 * descriptions.
 */
export function findSubPages(tree: MenuTree[], path: string) {
  return findMenuChildren(tree, path).flatMap(({ link }) =>
    link.url?.path
      ? [
          {
            label: link.label,
            url: link.url.path,
            description: link.description,
          },
        ]
      : [],
  )
}
