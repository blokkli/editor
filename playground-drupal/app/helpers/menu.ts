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

export type SubPage = {
  label: string
  url: string
  description?: string | null
  children: SubPage[]
}

function toSubPages(tree: MenuTree[], depth: number): SubPage[] {
  return tree.flatMap(({ link, subtree }) =>
    link.url?.path
      ? [
          {
            label: link.label,
            url: link.url.path,
            description: link.description,
            children: depth > 1 ? toSubPages(subtree ?? [], depth - 1) : [],
          },
        ]
      : [],
  )
}

/**
 * The sub-pages of an editorial page: its children in the menu, with their
 * descriptions and their own children, e.g. an area's topics and their
 * detail pages.
 */
export function findSubPages(tree: MenuTree[], path: string) {
  return toSubPages(findMenuChildren(tree, path), 2)
}
