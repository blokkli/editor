export type CommentItem = {
  uuid: string
  blockUuids: string[]
  resolved: boolean
  body: string
  created: string | number
  user: { label: string }
}

declare module '#blokkli/editor/adapter' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface BlokkliAdapter<T> {
    /**
     * Load all comments.
     */
    loadComments?: () => Promise<CommentItem[]>

    /**
     * Add a comment to one or more items.
     */
    addComment?: (blockUuids: string[], body: string) => Promise<CommentItem[]>

    /**
     * Resolve a comment.
     */
    resolveComment?: (uuid: string) => Promise<CommentItem[]>
  }
}

declare module '#blokkli/editor/types/permissions' {
  interface UserPermissionMap {
    create_comments: 'Post comments.'
    view_comments: 'Access comments.'
  }
}
