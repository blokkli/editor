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
      body: '<p>Hey <span class="bk-richtext-mention" data-type="mention" data-id="1" data-label="John Miller">@John Miller</span> — should we reword this section? It feels <strong>too technical</strong> for the audience we agreed on last week.</p>',
      isResolved: false,
      parentEntityType: 'content',
      parentEntityUuid: '1',
      created: t(2 * day + 4 * hour),
      referencedBlocks: [blockHero],
      user: '3',
    },
    {
      uuid: 'seed-1-r1',
      body: '<p>Agreed — a few quick thoughts:</p><ul><li>Lead with the value, not the architecture</li><li>Drop the term <em>"adapter pattern"</em> here</li><li>Move the API note to the footer</li></ul>',
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
      body: '<p>Thanks <span class="bk-richtext-mention" data-type="mention" data-id="2" data-label="Martin Faux">@Martin Faux</span> — <em>ping me</em> when there’s a draft.</p>',
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
      body: '<p>The spacing here feels off — <code>mt-15</code> looks too tight on mobile. Compare against <a href="https://example.com/spec/spacing">the spec</a>.</p>',
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
      body: '<p><strong>Reminder:</strong> launch is moved to next Friday. Schedule:</p><ol><li>Content freeze: <strong>Wednesday EOD</strong></li><li>Final review: <strong>Thursday morning</strong></li><li>Press kit out: <strong>Friday 9:00</strong></li></ol>',
      isResolved: false,
      parentEntityType: 'content',
      parentEntityUuid: '1',
      created: t(20 * hour),
      referencedBlocks: [],
      user: '6',
    },
    {
      uuid: 'seed-3-r1',
      body: '<p>Got it 👍</p>',
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
      body: '<p>Will the press kit be done by then? Need it for the partner email — pinging <span class="bk-richtext-mention" data-type="mention" data-id="4" data-label="Aisha Patel">@Aisha Patel</span>.</p>',
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
      body: '<p>Yes — <span class="bk-richtext-mention" data-type="mention" data-id="4" data-label="Aisha Patel">@Aisha Patel</span> is finishing the assets today.</p>',
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
      body: '<p>Typo here — <code>recieve</code> should be <code>receive</code>:</p><blockquote><p>"You will recieve a confirmation email shortly."</p></blockquote>',
      isResolved: false,
      parentEntityType: 'content',
      parentEntityUuid: '1',
      created: t(6 * hour),
      referencedBlocks: [blockGridFirst],
      user: '2',
    },
    {
      uuid: 'seed-4-r1',
      body: '<p>Fixed — <s>recieve</s> receive ✓</p>',
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
      body: '<p>Are we sure this animation is on-brand? It feels a bit <strong>playful</strong> for the homepage.</p><blockquote><p>"The brand voice is confident, never quirky."</p></blockquote><p>— from the brand guidelines.</p>',
      isResolved: true,
      parentEntityType: 'content',
      parentEntityUuid: '1',
      created: t(5 * day),
      referencedBlocks: [blockGridHeader],
      user: '5',
    },
    {
      uuid: 'seed-5-r1',
      body: '<p>Marketing signed off yesterday — see <a href="https://example.com/approvals/marketing-2024-q4">the approval thread</a>. We’re good to keep it.</p>',
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
      body: '<p><em>Nice teaser</em> — works well at this size.</p>',
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
      body: '<p><strong>Bumping this to the top of my list.</strong> After standup, I’ll knock these out:</p><ul data-type="taskList"><li data-type="taskItem" data-checked="true">Review the open feedback in this thread</li><li data-type="taskItem" data-checked="true">Draft the simplified hero copy</li><li data-type="taskItem" data-checked="false">Loop in <span class="bk-richtext-mention" data-type="mention" data-id="3" data-label="Sarah Chen">@Sarah Chen</span> for tone check</li><li data-type="taskItem" data-checked="false">Stage on preview branch</li></ul>',
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
 * Flip the checked state of the Nth `<li data-type="taskItem">` in a comment
 * body (document order, 0-based). No-op if the comment doesn't exist or the
 * index is out of range.
 */
export function toggleCommentTask(uuid: string, taskIndex: number): void {
  const comments = loadComments()
  const comment = comments.find((c) => c.uuid === uuid)
  if (!comment) return
  const doc = new DOMParser().parseFromString(comment.body, 'text/html')
  const items = doc.body.querySelectorAll('li[data-type="taskItem"]')
  const li = items[taskIndex]
  if (!li) return
  const next = li.getAttribute('data-checked') === 'true' ? 'false' : 'true'
  li.setAttribute('data-checked', next)
  comment.body = doc.body.innerHTML
  comment.updated = Date.now()
  saveComments(comments)
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
