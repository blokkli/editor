import { itemEntityType } from '#blokkli-build/config'
import { falsy } from '#blokkli/helpers'
import type { BlokkliApp } from '#blokkli/editor/types/app'
import type { BlokkliItemHost } from '#blokkli/editor/types/field'

/**
 * A droppable field whose media can be replaced.
 */
export type ReplaceMediaTarget = {
  id: string
  /**
   * What a drop does, such as "Replace Image".
   */
  label: string
  element: HTMLElement
  /**
   * Replace the field's media with the given one.
   */
  replace: (mediaId: string) => Promise<boolean>
}

/**
 * The droppable fields whose media can be replaced with a media of the bundle:
 * those with a single value that allow the bundle, of the page's entity or of
 * a block the user may edit.
 */
export function getReplaceMediaTargets(
  {
    adapter,
    directive,
    types,
    permissions,
    state,
    $t,
  }: Pick<
    BlokkliApp,
    'adapter' | 'directive' | 'types' | 'permissions' | 'state' | '$t'
  >,
  mediaBundle: string,
): ReplaceMediaTarget[] {
  const errorMessage = $t(
    'mediaLibraryReplaceFailed',
    'Failed to replace media.',
  )

  // @TODO: Restore this behaviour.
  // Ignore elements that are rendered inside a field that uses proxy mode, since implementations might use <BlokkliItem> to render blocks in a proxy-mode field.
  // return !el.closest('[data-bk-in-proxy="true"]')

  return directive
    .getDroppableElements()
    .map<ReplaceMediaTarget | undefined>((field) => {
      const config = types.getDroppableFieldConfig(field.fieldName, field)

      // Skip multi-value fields — the droppable-field-edit feature handles those.
      if (config.cardinality !== 1) {
        return
      }

      const allowedBundles = config.allowed.find(
        (v) => v.type === 'media',
      )?.bundles
      if (!allowedBundles || !allowedBundles.includes(mediaBundle)) {
        return
      }

      const isBlock = field.type === itemEntityType

      // Skip blocks where the user lacks edit permission or is inside
      // a restricted ancestor.
      if (
        isBlock &&
        (!permissions.checkBlockBundlePermission(field.bundle, 'edit') ||
          permissions.blockHasRestrictedAncestor(field.uuid))
      ) {
        return
      }

      const replaceMedia = isBlock
        ? adapter.mediaLibraryReplaceMedia
        : adapter.mediaLibraryReplaceEntityMedia
      if (!replaceMedia) {
        return
      }

      const host: BlokkliItemHost = {
        uuid: field.uuid,
        type: field.type,
        fieldName: field.fieldName,
      }

      return {
        id: `${isBlock ? 'replace-media' : 'replace-entity-media'}:${field.uuid}:${field.fieldName}`,
        label: $t('replaceField', 'Replace @field').replace(
          '@field',
          config.label,
        ),
        element: field.element,
        replace: (mediaId) =>
          state.mutateWithLoadingState(
            () => replaceMedia({ host, mediaId }),
            errorMessage,
          ),
      }
    })
    .filter(falsy)
}
