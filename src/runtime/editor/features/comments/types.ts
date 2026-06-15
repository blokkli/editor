import type { BlokkliUser } from '#blokkli/editor/types/user'

export type CommentItem = {
  uuid: string
  blockUuids?: string[]
  parentUuid?: string
  resolved: boolean
  body: string
  /**
   * ISO 8601 timestamp (e.g. `2026-05-03T14:32:18Z`).
   */
  created: string
  /**
   * ISO 8601 timestamp; set when the comment has been edited.
   */
  updated?: string
  /**
   * The author of the comment, or `null` when the comment is anonymous or the
   * author's account has since been deleted.
   */
  user: BlokkliUser | null
}

declare module '#blokkli/editor/adapter' {
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
