import type {
  BlokkliAdapterSearchResults,
  AdapterSearchArguments,
} from '#blokkli/editor/adapter'
import type { BlokkliItemHost } from '#blokkli/editor/types/field'
import type { EntityMetadata, FieldListItem } from '#blokkli/types'
import type { EditPermission } from '#blokkli/types/provider'

export type AdapterAddTemplate = {
  templateUuid: string
  host: BlokkliItemHost
  afterUuid: string | null
}

export type AdapterCreateTemplate = {
  label: string
  description?: string
  uuids: string[]
  isDefault?: boolean
}

export type TemplateItem = {
  uuid: string
  /**
   * The ID of the template, e.g. for the URL of its page.
   */
  id?: string
  label: string
  description?: string
  items?: FieldListItem[]
  itemBundles: string[]
  isDefault: boolean
  translationLanguages: string[]
  permissions: EditPermission[]
  metadata: EntityMetadata | null
}

export type AdapterTemplatesGetResult =
  BlokkliAdapterSearchResults<TemplateItem>

export type TemplatesSearchArguments = {
  /**
   * The field to add a template to: only templates whose blocks it allows.
   */
  host?: BlokkliItemHost & { bundle: string }
  includeItems: boolean
} & AdapterSearchArguments

export type AdapterDeleteTemplate = {
  templateUuid: string
}

export type AdapterTemplatesGetEditUrl = {
  templateUuid: string
  templateId: string | null
}

declare module '#blokkli/editor/adapter' {
  interface BlokkliAdapter<T> {
    /**
     * Add a template.
     */
    templatesAdd?: (
      e: AdapterAddTemplate,
    ) => Promise<MutationResponseLike<T>> | undefined

    /**
     * Search for templates.
     */
    templatesSearch?: (
      e: TemplatesSearchArguments,
    ) => Promise<AdapterTemplatesGetResult>

    /**
     * Create a new template from selected blocks.
     */
    templatesCreate?: (
      e: AdapterCreateTemplate,
    ) => Promise<MutationResponseLike<T>> | undefined

    /**
     * Delete a template.
     */
    templatesDelete?: (
      e: AdapterDeleteTemplate,
    ) => Promise<MutationResponseLike<T>> | undefined

    /**
     * Get the URL for editing a template.
     *
     * Returns null when the URL can't be built, e.g. without the ID.
     */
    templatesGetEditUrl?: (e: AdapterTemplatesGetEditUrl) => string | null
  }
}

declare module '#blokkli/editor/types/permissions' {
  interface UserPermissionMap {
    manage_default_templates: 'Manage default block templates.'
  }
}
