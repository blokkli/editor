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
  parentUuid?: string
  created: number
  updated?: number
  user: string
  referencedBlocks: string[]
}

/**
 * Get default comments that should be initialized if no comments exist.
 */
function getDefaultComments(): StoredComment[] {
  const now = Date.now()
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  const t = (offset: number): number => now - offset

  // Real block UUIDs from the playground page snapshot.
  const blockHero = 'b2a44272-8432-4516-8a6a-9837b0084884'
  const blockText = '4526d2d0-f122-4093-902f-e2f00a433981'
  const blockGridHeader = '3284016a-aa33-4994-8e4d-c0a6f9bd91c7'
  const blockGridFirst = '1645ba79-8770-4a0c-a58b-163a847eea22'
  const blockTeaser = 'd6020cd0-45f0-4200-8690-e297a38a1cca'

  return [
    // Active thread — multiple voices on a hero block.
    {
      uuid: 'seed-1-root',
      body: 'Should we reword this section? It feels too technical for the audience we agreed on last week.',
      isResolved: false,
      parentEntityType: 'content',
      parentEntityUuid: '1',
      created: t(2 * day + 4 * hour),
      referencedBlocks: [blockHero],
      user: '3',
    },
    {
      uuid: 'seed-1-r1',
      body: 'Agreed — let’s simplify the first paragraph.',
      isResolved: false,
      parentEntityType: 'content',
      parentEntityUuid: '1',
      parentUuid: 'seed-1-root',
      created: t(2 * day + 3 * hour),
      referencedBlocks: [],
      user: '1',
    },
    {
      uuid: 'seed-1-r2',
      body: 'I can take a stab at it tomorrow morning.',
      isResolved: false,
      parentEntityType: 'content',
      parentEntityUuid: '1',
      parentUuid: 'seed-1-root',
      created: t(2 * day + 2 * hour),
      referencedBlocks: [],
      user: '2',
    },
    {
      uuid: 'seed-1-r3',
      body: 'Thanks Martin — ping me when there’s a draft.',
      isResolved: false,
      parentEntityType: 'content',
      parentEntityUuid: '1',
      parentUuid: 'seed-1-root',
      created: t(1 * day + 8 * hour),
      referencedBlocks: [],
      user: '3',
    },

    // Single root, no replies.
    {
      uuid: 'seed-2-root',
      body: 'The spacing here feels off — looks too tight on mobile.',
      isResolved: false,
      parentEntityType: 'content',
      parentEntityUuid: '1',
      created: t(1 * day + 2 * hour),
      referencedBlocks: [blockText],
      user: '4',
    },

    // General thread, no block reference.
    {
      uuid: 'seed-3-root',
      body: 'Reminder: launch is moved to next Friday. Let’s freeze content changes by Wednesday EOD.',
      isResolved: false,
      parentEntityType: 'content',
      parentEntityUuid: '1',
      created: t(20 * hour),
      referencedBlocks: [],
      user: '6',
    },
    {
      uuid: 'seed-3-r1',
      body: 'Got it 👍',
      isResolved: false,
      parentEntityType: 'content',
      parentEntityUuid: '1',
      parentUuid: 'seed-3-root',
      created: t(19 * hour),
      referencedBlocks: [],
      user: '1',
    },
    {
      uuid: 'seed-3-r2',
      body: 'Will the press kit be done by then? Need it for the partner email.',
      isResolved: false,
      parentEntityType: 'content',
      parentEntityUuid: '1',
      parentUuid: 'seed-3-root',
      created: t(18 * hour),
      referencedBlocks: [],
      user: '5',
    },
    {
      uuid: 'seed-3-r3',
      body: 'Yes — Aisha is finishing the assets today.',
      isResolved: false,
      parentEntityType: 'content',
      parentEntityUuid: '1',
      parentUuid: 'seed-3-root',
      created: t(17 * hour),
      referencedBlocks: [],
      user: '6',
    },

    // Quick typo fix thread.
    {
      uuid: 'seed-4-root',
      body: 'Typo here — "recieve" should be "receive".',
      isResolved: false,
      parentEntityType: 'content',
      parentEntityUuid: '1',
      created: t(6 * hour),
      referencedBlocks: [blockGridFirst],
      user: '2',
    },
    {
      uuid: 'seed-4-r1',
      body: 'Fixed, thanks!',
      isResolved: false,
      parentEntityType: 'content',
      parentEntityUuid: '1',
      parentUuid: 'seed-4-root',
      created: t(5 * hour + 30 * minute),
      referencedBlocks: [],
      user: '3',
    },

    // Resolved thread.
    {
      uuid: 'seed-5-root',
      body: 'Are we sure this animation is on-brand? It feels a bit playful for the homepage.',
      isResolved: true,
      parentEntityType: 'content',
      parentEntityUuid: '1',
      created: t(5 * day),
      referencedBlocks: [blockGridHeader],
      user: '5',
    },
    {
      uuid: 'seed-5-r1',
      body: 'Marketing signed off yesterday — we’re good to keep it.',
      isResolved: false,
      parentEntityType: 'content',
      parentEntityUuid: '1',
      parentUuid: 'seed-5-root',
      created: t(4 * day + 20 * hour),
      referencedBlocks: [],
      user: '1',
    },

    // Older standalone resolved.
    {
      uuid: 'seed-6-root',
      body: 'Nice teaser — works well at this size.',
      isResolved: true,
      parentEntityType: 'content',
      parentEntityUuid: '1',
      created: t(10 * day),
      referencedBlocks: [blockTeaser],
      user: '4',
    },

    // Recent comment by current user — to demo edit/delete affordances.
    {
      uuid: 'seed-7-root',
      body: 'Bumping this to the top of my list — will revisit after standup.',
      isResolved: false,
      parentEntityType: 'content',
      parentEntityUuid: '1',
      created: t(45 * minute),
      referencedBlocks: [],
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
 * Reopen a previously resolved comment and persist to localStorage.
 */
export function unresolveComment(uuid: string): void {
  const comments = loadComments()
  const comment = comments.find((c) => c.uuid === uuid)
  if (comment) {
    comment.isResolved = false
    saveComments(comments)
  }
}

/**
 * Edit the body of a comment and persist.
 */
export function editComment(uuid: string, body: string): void {
  const comments = loadComments()
  const comment = comments.find((c) => c.uuid === uuid)
  if (comment) {
    comment.body = body
    comment.updated = Date.now()
    saveComments(comments)
  }
}

/**
 * Delete a comment. If the comment is a root, all replies are removed too.
 */
export function deleteComment(uuid: string): void {
  const comments = loadComments()
  const filtered = comments.filter(
    (c) => c.uuid !== uuid && c.parentUuid !== uuid,
  )
  saveComments(filtered)
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
