import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { selectBlock } from '../../support/blocks'
import {
  editableOverlay,
  openEditableField,
  plaintextEditor,
  saveByClickAway,
} from '../../support/editable'
import { emitEvent } from '../../support/events'
import { itemActionDisabled } from '../../support/itemActions'
import { runComponentTool } from '../../support/agent'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from '../../support/sandbox'
import { selectedUuids } from '../../support/selection'
import { editorPath, openEditor, withApp } from '../../support/session'
import { openSidebar } from '../../support/sidebar'

// The page "Field access" (content/nodes/field-access.yml), whose aside, right
// column and widget's title and media Tim may not edit.
const ASIDE_TITLE = seedUuid('paragraph', 'field-access-aside-title')
const ASIDE_LINKS = seedUuid('paragraph', 'field-access-aside-links')
const ASIDE_LINK = seedUuid('paragraph', 'field-access-aside-link')
const COLUMNS = seedUuid('paragraph', 'field-access-columns')
const LEFT = seedUuid('paragraph', 'field-access-left')
const RIGHT = seedUuid('paragraph', 'field-access-right')
const WIDGET = seedUuid('paragraph', 'field-access-widget')

// The same blocks on the page "Field access control", for Anna.
const CONTROL_ASIDE_TITLE = seedUuid(
  'paragraph',
  'field-access-control-aside-title',
)
const CONTROL_COLUMNS = seedUuid('paragraph', 'field-access-control-columns')

const RESTRICTED = '[data-test="item-actions-restricted"]'
const MOVE = '[data-test="interaction-move"]'

/** The IDs of the commands that the editor offers now. */
function commandIds(page: Page): Promise<string[]> {
  return withApp(page, (app) =>
    app.commands.getCommands().map((command) => command.id),
  )
}

/**
 * A field that the user may not edit is read-only in the editor. Drupal
 * refuses every change to it (`checkHostUpdateAccessRecursive()`,
 * `checkFieldUpdateAccess()`), so the editor offers none:
 * - a block in a read-only paragraphs field is selectable but restricted, with
 *   no actions, and a block nested in it selects it
 * - the field takes no blocks, and its blocks can't be dragged out
 * - a read-only text or reference field doesn't open
 *
 * The test module blokkli_playground_test locks the fields for Tim's role
 * (`FieldAccessHooks`). Anna, an editor, may edit them: her page is the
 * control.
 *
 * Page lifecycle: Tim on the page "Field access", Anna on the page "Field
 * access control", opened in parallel (whoever opens a page first owns its
 * edit state). Nothing is changed; `afterEach` closes what a test opened and
 * deselects.
 */
describe('Read-only fields', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page
  let controlPage: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    ;[page, controlPage] = await Promise.all([
      openEditor(
        sandbox,
        'Tim Fischer',
        editorPath('/en/field-access', 'field-access'),
      ),
      openEditor(
        sandbox,
        'Anna Keller',
        editorPath('/en/field-access-control', 'field-access-control'),
      ),
    ])
  })

  afterAll(async () => {
    await Promise.all([page.close(), controlPage.close()])
  })

  afterEach(async () => {
    if (await editableOverlay(page).isVisible()) {
      await saveByClickAway(page)
      await editableOverlay(page).waitFor({ state: 'detached' })
    }
    await Promise.all([
      emitEvent(page, 'select:unselect'),
      emitEvent(controlPage, 'select:unselect'),
    ])
  })

  test('the editor knows the fields that Drupal locks for the user', async () => {
    const readOnly = (p: Page) =>
      withApp(p, (app) => ({
        aside: app.permissions.isFieldReadOnly('node', 'page', 'field_aside'),
        right: app.permissions.isFieldReadOnly(
          'paragraph',
          'columns',
          'field_right',
        ),
        content: app.permissions.isFieldReadOnly(
          'node',
          'page',
          'field_paragraphs',
        ),
        title: !!app.types.editableFieldConfig.forName(
          'paragraph',
          'widget',
          'field_title',
        )?.readOnly,
        media: !!app.types.droppableFieldConfig.forName(
          'paragraph',
          'widget',
          'field_media_items',
        )?.readOnly,
      }))

    expect(await readOnly(page)).toEqual({
      aside: true,
      right: true,
      content: false,
      title: true,
      media: true,
    })
    expect(await readOnly(controlPage)).toEqual({
      aside: false,
      right: false,
      content: false,
      title: false,
      media: false,
    })
  })

  test('a block in a read-only field is restricted and has no actions', async () => {
    for (const uuid of [ASIDE_TITLE, RIGHT]) {
      await selectBlock(page, uuid)
      await page.locator(RESTRICTED).waitFor({ state: 'visible' })
      for (const action of ['delete', 'duplicate', 'edit']) {
        expect(await itemActionDisabled(page, action)).toBe(true)
      }
      // It can't be dragged out of its field.
      expect(await page.locator(MOVE).isDisabled()).toBe(true)
    }

    // The same block may be changed by an editor.
    await selectBlock(controlPage, CONTROL_ASIDE_TITLE)
    await expect
      .poll(() => itemActionDisabled(controlPage, 'delete'))
      .toBe(false)
    expect(await controlPage.locator(RESTRICTED).isVisible()).toBe(false)
  })

  test('selecting a block nested in it selects the block in the field', async () => {
    await emitEvent(page, 'select', ASIDE_LINK)
    await expect.poll(() => selectedUuids(page)).toEqual([ASIDE_LINKS])
  })

  test('the block holding a read-only field stays editable', async () => {
    await selectBlock(page, COLUMNS)
    await expect.poll(() => itemActionDisabled(page, 'delete')).toBe(false)
    expect(await itemActionDisabled(page, 'duplicate')).toBe(false)
    expect(await page.locator(MOVE).isDisabled()).toBe(false)
    expect(await page.locator(RESTRICTED).isVisible()).toBe(false)
  })

  test('the editor offers no command that adds to a read-only field', async () => {
    // With nothing selected: appending to the fields of the page.
    const appendsTo = (ids: string[], field: string) =>
      ids.some(
        (id) =>
          id.startsWith('block_add_list:append_end:') && id.endsWith(field),
      )
    const ids = await commandIds(page)
    expect(appendsTo(ids, 'field_paragraphs')).toBe(true)
    expect(appendsTo(ids, 'field_aside')).toBe(false)
    expect(appendsTo(await commandIds(controlPage), 'field_aside')).toBe(true)

    // With the columns selected: inserting into their fields.
    const insertsInto = (ids: string[], field: string) =>
      ids.some((id) => id.startsWith(`block_add_list:insert:${field}:`))
    await selectBlock(page, COLUMNS)
    await selectBlock(controlPage, CONTROL_COLUMNS)
    await expect
      .poll(async () => insertsInto(await commandIds(page), 'field_left'))
      .toBe(true)
    expect(insertsInto(await commandIds(page), 'field_right')).toBe(false)
    await expect
      .poll(async () =>
        insertsInto(await commandIds(controlPage), 'field_right'),
      )
      .toBe(true)
  })

  test('a read-only text field does not open', async () => {
    // The widget's title, and the title of a block in a read-only field.
    await openEditableField(page, 'field_title', WIDGET)
    await openEditableField(page, 'field_title', ASIDE_TITLE)
    await page.waitForTimeout(300)
    expect(await editableOverlay(page).count()).toBe(0)

    // Another title opens.
    await openEditableField(page, 'field_title', LEFT)
    await plaintextEditor(page).waitFor({ state: 'visible' })
  })

  test('a read-only reference field does not open', async () => {
    await emitEvent(page, 'droppable:open', {
      uuid: WIDGET,
      entityType: 'paragraph',
      fieldName: 'field_media_items',
    })
    await page.waitForTimeout(300)
    expect(
      await page.locator('[data-test="droppable-field-edit-list"]').count(),
    ).toBe(0)
  })

  test('the agent can not change a read-only text field', async () => {
    await openSidebar(page, 'test-cases')
    // The tool refuses before it shows a change to approve.
    const error = await runComponentTool(page, 'update_text_fields', {
      updates: [
        { uuid: WIDGET, fieldName: 'field_title', value: 'A new title' },
      ],
    }).then(
      () => '',
      (e: Error) => e.message,
    )
    expect(error).toContain('fields that the user may not change')
    expect(error).toContain('field is read-only')
  })
})
