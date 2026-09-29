import type { ParagraphLinkFragment } from '#graphql-operations'

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
