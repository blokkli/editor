export type ReferencedEntity = {
  /**
   * The URL of the form that edits the entity. Without it, the entity is
   * listed but can't be opened: the user may view it, but not edit it.
   */
  editUrl?: string
  entityBundle: string
  entityType: string
  entityUuid: string
  label: string
  uuids: string[]
}

declare module '#blokkli/editor/adapter' {
  interface BlokkliAdapter<T> {
    getReferencedEntities?(uuids: string[]): Promise<ReferencedEntity[]>
  }
}
