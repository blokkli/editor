import type {
  BlokkliAdapterSearchResults,
  AdapterSearchArguments,
} from '#blokkli/editor/adapter'
import type { BlokkliItemHost } from '#blokkli/editor/types/field'
import type { FieldListItem } from '#blokkli/types'

export type AdapterAddTemplate = {
  templateUuid: string
  host: BlokkliItemHost
  afterUuid: string | null
}

export type TemplateItem = {
  uuid: string
  label: string
  description?: string
  items: FieldListItem[]
  isDefault: boolean
}

export type AdapterTemplatesGetResult =
  BlokkliAdapterSearchResults<TemplateItem>

export type TemplatesSearchArguments = {
  host?: BlokkliItemHost
} & AdapterSearchArguments

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
  }
}
