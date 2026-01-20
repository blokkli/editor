import type {
  BlokkliAdapterSearchResults,
  AdapterSearchArguments,
} from '#blokkli/editor/adapter'
import type { BlokkliItemHost } from '#blokkli/editor/types/field'
import type { FieldListItem } from '#blokkli/types'
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
  label: string
  description?: string
  items: FieldListItem[]
  isDefault: boolean
  permissions: EditPermission[]
}

export type AdapterTemplatesGetResult =
  BlokkliAdapterSearchResults<TemplateItem>

export type TemplatesSearchArguments = {
  host?: BlokkliItemHost
} & AdapterSearchArguments

export type AdapterDeleteTemplate = {
  templateUuid: string
}

export type AdapterTemplatesGetEditUrl = {
  templateUuid: string
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
     */
    templatesGetEditUrl?: (e: AdapterTemplatesGetEditUrl) => string
  }
}
