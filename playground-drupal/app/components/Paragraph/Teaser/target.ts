import type {
  NodeTeaserFragment,
  ParagraphTeaserFragment,
} from '#graphql-operations'

// Only nodes have fields in the fragment: a document's entity is empty.
function isNode(
  entity: NodeTeaserFragment | object,
): entity is NodeTeaserFragment {
  return '__typename' in entity
}

// The node a teaser links to, and its URL. A link to a page the visitor can't
// see (e.g. unpublished) has no entity: without a title of its own, the
// teaser has no URL and isn't shown.
export function teaserTarget(teaser: ParagraphTeaserFragment) {
  const uri = teaser.link?.uri
  const entity = uri && 'entity' in uri ? uri.entity : null
  const node = entity && isNode(entity) ? entity : null
  const url =
    !uri || ('entity' in uri && !node && !teaser.title) ? null : uri.path
  return { node, url }
}
