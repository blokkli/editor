/**
 * LocalStorage-based comment persistence for the playground.
 */

const STORAGE_KEY = 'blokkli_playground_comments'

export interface StoredComment {
  uuid: string
  body: string
  isResolved: boolean
  parentEntityType: string
  parentEntityUuid: string
  created: number
  user: string
  referencedBlocks: string[]
}

/**
 * Get default comments that should be initialized if no comments exist.
 */
function getDefaultComments(): StoredComment[] {
  return [
    {
      uuid: 'default-comment-1',
      body: 'This is very nice!',
      isResolved: true,
      parentEntityType: 'content',
      created: new Date(2023, 11, 4, 13, 2).getTime(),
      parentEntityUuid: '1',
      referencedBlocks: ['18a7ed49-7355-4d0d-9004-6623c98a999f'],
      user: '1',
    },
    {
      uuid: 'default-comment-2',
      body: 'We should probably link to the code in the repo for the adapter.',
      isResolved: false,
      parentEntityType: 'content',
      created: new Date(2023, 11, 4, 11, 2).getTime(),
      parentEntityUuid: '1',
      referencedBlocks: ['c414a773-406c-4200-aef6-ada9349b3f11'],
      user: '1',
    },
  ]
}

/**
 * Load all comments from localStorage.
 * If no comments exist, returns default comments.
 */
export function loadComments(): StoredComment[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored) as StoredComment[]
    }
  } catch (error) {
    console.error('Failed to load comments from localStorage:', error)
  }

  // Initialize with defaults if nothing exists
  const defaults = getDefaultComments()
  saveComments(defaults)
  return defaults
}

/**
 * Save comments to localStorage.
 */
export function saveComments(comments: StoredComment[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(comments))
  } catch (error) {
    console.error('Failed to save comments to localStorage:', error)
  }
}

/**
 * Add a new comment and persist to localStorage.
 */
export function addComment(comment: StoredComment): void {
  const comments = loadComments()
  comments.push(comment)
  saveComments(comments)
}

/**
 * Resolve a comment and persist to localStorage.
 */
export function resolveComment(uuid: string): void {
  const comments = loadComments()
  const comment = comments.find((c) => c.uuid === uuid)
  if (comment) {
    comment.isResolved = true
    saveComments(comments)
  }
}

/**
 * Get comments for a specific parent entity.
 */
export function getCommentsForEntity(
  entityType: string,
  entityUuid: string,
): StoredComment[] {
  const comments = loadComments()
  return comments.filter(
    (c) =>
      c.parentEntityType === entityType && c.parentEntityUuid === entityUuid,
  )
}
