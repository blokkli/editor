export type ReferencedEntity = {
  editUrl: string
  entityBundle: string
  entityType: string
  entityUuid: string
  label: string
  uuids: string[]
}

declare module '#blokkli/editor/adapter' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface BlokkliAdapter<T> {
    getReferencedEntities?(uuids: string[]): Promise<ReferencedEntity[]>
  }
}
