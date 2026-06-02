declare module '#blokkli/editor/adapter' {
  interface BlokkliAdapter<T> {
    /**
     * Take ownership of the edit state.
     */
    takeOwnership?: () => Promise<MutationResponseLike<T>>
  }
}

declare module '#blokkli/editor/types/permissions' {
  interface UserPermissionMap {
    take_ownership: 'Take ownership of edit state'
  }
}

export {}
