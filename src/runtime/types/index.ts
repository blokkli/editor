import type { FieldListItem } from './field'

export type { FieldListItem }

export type EntityContext = {
  uuid: string
  type: string
  bundle: string
}

export type EntityMetadata = {
  description: string | null
  createdBy: string | null
  dateUpdated: string | null
  dateCreated: string | null
}

export default {}
