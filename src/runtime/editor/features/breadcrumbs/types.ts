export type CrumbField = {
  type: 'field'
  label: string
  entityUuid: string
  fieldName: string
}

export type CrumbBlock = {
  type: 'block'
  label: string
  uuid: string
}

export type CrumbMultiple = {
  type: 'multiple'
  count: number
}

/** A crumb produced by walking the selected block's parent chain. */
export type Crumb = CrumbField | CrumbBlock | CrumbMultiple
