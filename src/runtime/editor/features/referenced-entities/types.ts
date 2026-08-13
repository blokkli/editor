export type ReferencedEntity = {
  editUrl: string
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
