import type {
  ConfigPageSiteFragment,
  ParagraphLinkFragment,
} from '#graphql-operations'

// Where a link block points to. A document (e.g. a dropped PDF) links to its
// file; a page or a URL to its path.
export function linkTarget(link: ParagraphLinkFragment['link']) {
  const uri = link?.uri
  const entity = uri && 'entity' in uri ? uri.entity : null
  const file = entity && 'mediaFileUrl' in entity ? entity.mediaFileUrl : null
  return {
    href: file?.path ?? uri?.path ?? undefined,
    label: entity?.label ?? undefined,
    document: entity?.__typename === 'MediaDocument',
    filesize:
      entity && 'file' in entity ? entity.file?.entity?.filesize : undefined,
  }
}

// The field only allows links.
function isLink(
  value: ParagraphLinkFragment | object,
): value is ParagraphLinkFragment {
  return 'link' in value
}

/**
 * A paragraphs field of links as plain links, for rendering them without
 * blökkli: e.g. the service links in the menu panel.
 */
export function plainLinks(
  items?: ConfigPageSiteFragment['serviceLinks'],
): { label: string; url: string }[] {
  return (items ?? []).flatMap((item) => {
    if (!item?.props || !isLink(item.props)) {
      return []
    }
    const target = linkTarget(item.props.link)
    const label = item.props.title || target.label
    return target.href && label ? [{ label, url: target.href }] : []
  })
}
