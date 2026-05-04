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
      body: '<p>Hallo <span class="bk-richtext-mention" data-type="mention" data-id="1" data-label="John Miller">@John Miller</span> – sollten wir diesen Abschnitt umformulieren? Er wirkt <strong>zu technisch</strong> für die Zielgruppe, auf die wir uns letzte Woche geeinigt haben.</p>',
      isResolved: false,
      parentEntityType: 'content',
      parentEntityUuid: '1',
      created: t(2 * day + 4 * hour),
      referencedBlocks: [blockHero],
      user: '3',
    },
    {
      uuid: 'seed-1-r1',
      body: '<p>Einverstanden – ein paar kurze Gedanken:</p><ul><li>Mit dem Mehrwert beginnen, nicht mit der Architektur</li><li>Den Begriff <em>"Adapter-Pattern"</em> hier weglassen</li><li>Den API-Hinweis in die Fußzeile verschieben</li></ul>',
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
      body: 'Ich kann mich morgen früh daran versuchen.',
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
      body: '<p>Danke <span class="bk-richtext-mention" data-type="mention" data-id="2" data-label="Martin Faux">@Martin Faux</span> – <em>melden Sie sich</em>, sobald ein Entwurf vorliegt.</p>',
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
      body: '<p>Die Abstände hier wirken nicht stimmig – <code>mt-15</code> sieht auf dem Handy zu eng aus. Bitte mit <a href="https://example.com/spec/spacing">der Spezifikation</a> vergleichen.</p>',
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
      body: '<p><strong>Erinnerung:</strong> Der Launch wurde auf nächsten Freitag verschoben. Zeitplan:</p><ol><li>Inhalte-Freeze: <strong>Mittwoch Ende des Tages</strong></li><li>Finales Review: <strong>Donnerstagmorgen</strong></li><li>Pressekit raus: <strong>Freitag 9:00</strong></li></ol>',
      isResolved: false,
      parentEntityType: 'content',
      parentEntityUuid: '1',
      created: t(20 * hour),
      referencedBlocks: [],
      user: '6',
    },
    {
      uuid: 'seed-3-r1',
      body: '<p>Verstanden 👍</p>',
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
      body: '<p>Wird das Pressekit bis dahin fertig sein? Wir brauchen es für die Partner-E-Mail – Ping an <span class="bk-richtext-mention" data-type="mention" data-id="4" data-label="Aisha Patel">@Aisha Patel</span>.</p>',
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
      body: '<p>Ja – <span class="bk-richtext-mention" data-type="mention" data-id="4" data-label="Aisha Patel">@Aisha Patel</span> stellt die Assets heute fertig.</p>',
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
      body: '<p>Tippfehler hier – <code>erhalen</code> sollte <code>erhalten</code> heißen:</p><blockquote><p>"Sie erhalen in Kürze eine Bestätigungs-E-Mail."</p></blockquote>',
      isResolved: false,
      parentEntityType: 'content',
      parentEntityUuid: '1',
      created: t(6 * hour),
      referencedBlocks: [blockGridFirst],
      user: '2',
    },
    {
      uuid: 'seed-4-r1',
      body: '<p>Behoben – <s>erhalen</s> erhalten ✓</p>',
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
      body: '<p>Sind wir sicher, dass diese Animation zur Marke passt? Sie wirkt für die Startseite etwas <strong>verspielt</strong>.</p><blockquote><p>"Die Markenstimme ist selbstbewusst, niemals schräg."</p></blockquote><p>– aus den Markenrichtlinien.</p>',
      isResolved: true,
      parentEntityType: 'content',
      parentEntityUuid: '1',
      created: t(5 * day),
      referencedBlocks: [blockGridHeader],
      user: '5',
    },
    {
      uuid: 'seed-5-r1',
      body: '<p>Das Marketing hat gestern abgenickt – siehe <a href="https://example.com/approvals/marketing-2024-q4">den Freigabe-Thread</a>. Wir können sie behalten.</p>',
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
      body: '<p><em>Schöner Teaser</em> – funktioniert gut in dieser Größe.</p>',
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
      body: '<p><strong>Ich setze das ganz nach oben auf meine Liste.</strong> Nach dem Standup arbeite ich diese Punkte ab:</p><ul data-type="taskList"><li data-type="taskItem" data-checked="true">Offenes Feedback in diesem Thread durchgehen</li><li data-type="taskItem" data-checked="true">Vereinfachten Hero-Text entwerfen</li><li data-type="taskItem" data-checked="false"><span class="bk-richtext-mention" data-type="mention" data-id="3" data-label="Sarah Chen">@Sarah Chen</span> für eine Tonalitätsprüfung einbinden</li><li data-type="taskItem" data-checked="false">Auf Preview-Branch deployen</li></ul>',
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
