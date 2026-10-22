import type { Page } from 'playwright-core'

/**
 * The XSS canary (plans/xss, step 1): every place where the editor could render
 * content as markup gets a payload with an id of its own. A payload that runs
 * calls `window.__bkXss(id)`, which records the id; the specs check which ids
 * ran.
 *
 * The specs store the payloads through the adapter, as a request made by hand
 * would, each in its own sandbox: no fixtures, no bake.
 *
 * A spec asserts what happens today. Until its fix, that the payload runs.
 * After it, that the place shows the payload as text, and that no payload ran
 * (`settledCanaries()`).
 */

declare global {
  interface Window {
    __bkXss?: (id: string) => void
    __bkXssRan?: string[]
  }
}

/** The places the canary covers, one payload each. */
export type CanaryId =
  | 'page-title'
  | 'text'
  | 'heading'
  | 'raw-text'
  | 'comment'
  | 'agent-prompt'
  | 'agent-reply'
  | 'agent-rewrite'
  | 'import-title'
  | 'import-text'

/**
 * The payload for `id`: markup that calls `window.__bkXss(id)` when the
 * browser runs it. The specs put `CANARY_WORD` in front of it, to find the
 * value.
 *
 * Filled in by hand.
 */
export function canaryPayload(id: CanaryId): string {
  return `<img src="#foobar" onerror="window.__bkXss('${id}')">`
}

/** The word in front of every payload: what a search finds it by. */
export const CANARY_WORD = 'Canary'

/** The payload as text: what someone who types it into a plain field stores. */
export function canaryText(id: CanaryId): string {
  return `${CANARY_WORD} ${canaryPayload(id)}`
}

/**
 * The payload as the markup of a formatted field when it's typed in as text:
 * escaped, as the field's editor stores it.
 */
export function canaryTypedHtml(id: CanaryId): string {
  const escaped = canaryText(id)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
  return `<p>${escaped}</p>`
}

/**
 * The payload as raw markup of a formatted field, as a request made by hand
 * stores it. Drupal filters it when it renders the field.
 */
export function canaryRawHtml(id: CanaryId): string {
  return `<p>${CANARY_WORD} ${canaryPayload(id)}</p>`
}

/**
 * Records the ids of the payloads that run: in the current document, and in
 * every document the page loads from now on (a reload, a navigation).
 */
export async function installCanary(page: Page): Promise<void> {
  const install = () => {
    window.__bkXssRan ??= []
    window.__bkXss = (id: string) => {
      window.__bkXssRan!.push(id)
    }
  }
  await page.addInitScript(install)
  await page.evaluate(install)
}

/** The ids of the payloads that ran since the last `resetCanary()`. */
export function canariesRan(page: Page): Promise<string[]> {
  return page.evaluate(() => [...(window.__bkXssRan ?? [])])
}

/**
 * The ids of the payloads that ran, after giving a payload in the page time to
 * run: its image has to fail to load first. For the check that none did.
 */
export async function settledCanaries(page: Page): Promise<string[]> {
  await page.waitForTimeout(1000)
  return canariesRan(page)
}

/** Forget the ids recorded so far. */
export function resetCanary(page: Page): Promise<void> {
  return page.evaluate(() => {
    window.__bkXssRan = []
  })
}

type Job =
  | { kind: 'field'; uuid: string; fieldName: string; value: string }
  | { kind: 'page-field'; fieldName: string; value: string }
  | { kind: 'publish' }
  | { kind: 'comment'; blockUuids: string[]; body: string }

type JobWindow = Window & {
  __e2eCanaryJobs?: Map<number, { error?: string }>
}

let jobs = 0

/**
 * Run an adapter call in the page. As `addBlock` does, the page stores the
 * outcome and the test polls for it: on a slow CPU, Chromium sometimes drops
 * the promise a `page.evaluate` waits on.
 */
async function runJob(page: Page, job: Job): Promise<void> {
  const id = ++jobs
  await page.evaluate(
    ({ id, job }) => {
      const app = window.__BLOKKLI__!.app!
      const outcomes = ((window as JobWindow).__e2eCanaryJobs ??= new Map())
      const run = (): Promise<unknown> => {
        switch (job.kind) {
          case 'field':
            return app.state.mutateWithLoadingState(() =>
              app.adapter.updateFieldValue!({
                uuid: job.uuid,
                fieldName: job.fieldName,
                fieldValue: job.value,
              }),
            )
          case 'page-field':
            return app.state.mutateWithLoadingState(() =>
              app.adapter.updateEntityFieldValue!({
                fieldName: job.fieldName,
                fieldValue: job.value,
              }),
            )
          case 'publish':
            return app.state.mutateWithLoadingState(() =>
              app.adapter.publish!({
                hostEntityType: app.context.value.entityType,
                hostEntityUuid: app.context.value.entityUuid,
                closeAfterPublish: false,
              }),
            )
          case 'comment':
            return app.adapter.addComment!(job.blockUuids, job.body)
        }
      }
      run().then(
        (result) => {
          outcomes.set(
            id,
            result === false ? { error: 'Drupal refused it.' } : {},
          )
        },
        (e) => {
          outcomes.set(id, { error: String(e) })
        },
      )
    },
    { id, job },
  )
  await page.waitForFunction(
    (id) => !!(window as JobWindow).__e2eCanaryJobs?.has(id),
    id,
  )
  const outcome = await page.evaluate((id) => {
    const outcomes = (window as JobWindow).__e2eCanaryJobs!
    const outcome = outcomes.get(id)!
    outcomes.delete(id)
    return outcome
  }, id)
  if (outcome.error) {
    throw new Error(`${job.kind}: ${outcome.error}`)
  }
}

/** Store a paragraph's field value (`pbUpdateFieldValue`). */
export function storeFieldValue(
  page: Page,
  uuid: string,
  fieldName: string,
  value: string,
): Promise<void> {
  return runJob(page, { kind: 'field', uuid, fieldName, value })
}

/** Store a field value of the page itself, e.g. its title. */
export function storePageFieldValue(
  page: Page,
  fieldName: string,
  value: string,
): Promise<void> {
  return runJob(page, { kind: 'page-field', fieldName, value })
}

/**
 * Publish the page's changes, so that what Drupal searches (the stored
 * entity, not the edit state) has them.
 */
export function publishChanges(page: Page): Promise<void> {
  return runJob(page, { kind: 'publish' })
}

/**
 * Add a comment to the blocks, with the body as it's sent. The comments
 * feature loads its list when the editor starts: reload to see it.
 */
export function storeComment(
  page: Page,
  blockUuids: string[],
  body: string,
): Promise<void> {
  return runJob(page, { kind: 'comment', blockUuids, body })
}
