export type CommentItem = {
  uuid: string
  blockUuids?: string[]
  parentUuid?: string
  resolved: boolean
  body: string
  created: string | number
  updated?: string | number
  user: {
    /**
     * Stable identifier for the comment author. Adapters that support
     * editing/deleting own comments should set this. Used for grouping and
     * identity display.
     */
    id?: string
    label: string
  }
  /**
   * True when the viewing user authored this comment. Adapters that support
   * editing or deleting own comments must set this; the editor uses it to
   * gate the corresponding UI affordances.
   */
  isOwn?: boolean
}

declare module '#blokkli/editor/adapter' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface BlokkliAdapter<T> {
    /**
     * Load all comments (roots and replies in a flat list).
     */
    loadComments?: () => Promise<CommentItem[]>

    /**
     * Add a root comment to one or more blocks.
     */
    addComment?: (blockUuids: string[], body: string) => Promise<CommentItem[]>

    /**
     * Reply to a root comment.
     */
    replyToComment?: (
      parentUuid: string,
      body: string,
    ) => Promise<CommentItem[]>

    /**
     * Edit the body of an existing comment.
     */
    editComment?: (uuid: string, body: string) => Promise<CommentItem[]>

    /**
     * Delete a comment. Deleting a root removes all of its replies.
     */
    deleteComment?: (uuid: string) => Promise<CommentItem[]>

    /**
     * Resolve a thread (must be a root comment uuid).
     */
    resolveComment?: (uuid: string) => Promise<CommentItem[]>

    /**
     * Reopen a previously resolved thread.
     */
    unresolveComment?: (uuid: string) => Promise<CommentItem[]>

    /**
     * Toggle the checked state of a task item inside a comment body. The
     * `taskIndex` is the document-order position (0-based) of the
     * `<li data-type="taskItem">` to flip. Anyone with view access can
     * toggle, regardless of comment ownership. Returns the updated comment.
     */
    toggleCommentTask?: (
      uuid: string,
      taskIndex: number,
    ) => Promise<CommentItem>
  }
}

declare module '#blokkli/editor/types/permissions' {
  interface UserPermissionMap {
    create_comments: 'Post comments.'
    view_comments: 'Access comments.'
  }
}
