import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { openEditor, withApp } from '../../support/session'
import { addBlock } from '../../support/blocks'
import { setupEditorE2E } from '../../support/setup'
import {
  discardEditable,
  editableOverlay,
  openEditableField,
  plaintextEditor,
  saveByClickAway,
  storedFieldValue,
} from '../../support/editable'
import { openSidebar } from '../../support/sidebar'
import { runAgentTool } from '../../support/agent'

/**
 * Text that lives INSIDE a non-text field, addressed by property path.
 *
 * The `link` block stores its title as a property of a `field_link`-shaped
 * field, the way Drupal does, rather than as a separate text field the way
 * `button` does. Such a value is addressed as `<field>.<property>` —
 * `link.title` — which is the convention `paragraphs_blokkli` already uses for
 * writes (`UpdateFieldValueTrait::updateTextFieldValue` splits on the dot and
 * updates only that property; `field_text.format` ships on it today).
 *
 * `button` is asserted alongside `link` throughout: it carries the same two
 * pieces of information in separate fields, so it is the control proving these
 * assertions are about the field SHAPE, not about the fixture being absent.
 */
describe('link field titles', async () => {
  await setupEditorE2E()

  const STORED_TITLE = 'Read more about it'
  const STORED_URI = 'https://www.example.com'

  let page: Page
  let linkUuid: string
  let buttonUuid: string

  async function blockItems(): Promise<
    Array<{ uuid: string; bundle: string; props: Record<string, any> }>
  > {
    return withApp(page, (app) =>
      app.state.mutatedFields.value.flatMap((field) =>
        field.list.map((item) => ({
          uuid: item.uuid,
          bundle: item.bundle,
          props: JSON.parse(JSON.stringify(item.props ?? {})),
        })),
      ),
    )
  }

  async function linkProps(): Promise<Record<string, any>> {
    const item = (await blockItems()).find((i) => i.uuid === linkUuid)
    return item?.props ?? {}
  }

  beforeAll(async () => {
    page = await openEditor()
    const link = await addBlock(page, { bundle: 'link', fieldName: 'content' })
    if (!link) throw new Error('Failed to add link block')
    linkUuid = link

    const button = await addBlock(page, {
      bundle: 'button',
      fieldName: 'content',
    })
    if (!button) throw new Error('Failed to add button block')
    buttonUuid = button

    await page.locator(`[data-bk-uuid="${linkUuid}"]`).waitFor()
  })

  afterAll(async () => {
    await page.close()
  })

  // An editable overlay left open would collide with the next test's, so close
  // any that survived (a discard leaves the node around for its transition).
  afterEach(async () => {
    await expect
      .poll(async () => {
        const count = await editableOverlay(page).count()
        if (count > 0) {
          await page.keyboard.press('Escape')
        }
        return count
      })
      .toBe(0)
  })

  test('the block renders its title from the link field', async () => {
    const el = page.locator(`[data-bk-uuid="${linkUuid}"]`)
    expect(await el.textContent()).toContain(STORED_TITLE)
  })

  test('the link value carries both uri and title', async () => {
    const props = await linkProps()
    expect(props.link).toMatchObject({ uri: STORED_URI, title: STORED_TITLE })
  })

  test('the title is exposed as a text value at its property path', async () => {
    const values = await withApp(page, (app) =>
      app.fieldValue.getTextFieldValues(),
    )
    expect(values.some((v) => v.uuid === buttonUuid)).toBe(true)

    const entry = values.find(
      (v) => v.uuid === linkUuid && v.fieldName === 'link.title',
    )
    expect(entry?.value).toBe(STORED_TITLE)
    expect(entry?.fieldType).toBe('plain')
  })

  test('the uri is not exposed as editable text', async () => {
    // A link target is a droppable field, not something to rewrite or
    // translate as prose.
    const values = await withApp(page, (app) =>
      app.fieldValue.getTextFieldValues(),
    )
    expect(
      values.some((v) => v.uuid === linkUuid && v.fieldName.endsWith('.uri')),
    ).toBe(false)
  })

  test('the title is an editable field at its property path', async () => {
    const names = await withApp(page, (app) =>
      app.types.editableFieldConfig
        .forEntityTypeAndBundle('paragraph', 'link')
        .map((c) => c.name),
    )
    expect(names).toContain('link.title')
  })

  test('readRawValue resolves the property path', async () => {
    const value = await withApp(page, (app) => {
      const uuid = app.state.mutatedFields.value
        .flatMap((f) => f.list)
        .find((i) => i.bundle === 'link')?.uuid
      if (!uuid) return null
      return app.fieldValue.readRawValue(
        'paragraph',
        uuid,
        'link',
        'link.title',
        'plain',
      )
    })
    expect(value).toBe(STORED_TITLE)
  })

  test('the live preview updates the title without dropping the uri', async () => {
    // The core of it: a prop override used to replace the whole `link` prop
    // with a bare string, destroying the uri. It has to merge into the object.
    await openEditableField(page, 'link.title', linkUuid)
    const editor = plaintextEditor(page)
    await editor.waitFor({ state: 'visible' })
    expect(await editor.inputValue()).toBe(STORED_TITLE)

    // The preview lives in `mutatedItemProps`, not the committed field list, so
    // assert what the block actually renders.
    const anchor = page.locator(`[data-bk-uuid="${linkUuid}"] a`)
    await editor.fill('Vorschau')

    await expect.poll(() => anchor.textContent()).toContain('Vorschau')
    expect(await anchor.getAttribute('href')).toBe(STORED_URI)

    const override = await withApp(
      page,
      (app) => app.state.mutatedItemProps as Record<string, any>,
    )
    expect(Object.values(override).find((v) => v?.link)?.link).toMatchObject({
      uri: STORED_URI,
      title: 'Vorschau',
    })

    await discardEditable(page)
    await expect.poll(() => anchor.textContent()).toContain(STORED_TITLE)
  })

  test('saving writes only the title and keeps the uri', async () => {
    // Own block: this one commits a mutation, so it must not disturb the
    // fixtures the read-only cases share.
    const uuid = await addBlock(page, { bundle: 'link', fieldName: 'content' })
    if (!uuid) throw new Error('Failed to add link block')
    await page.locator(`[data-bk-uuid="${uuid}"]`).waitFor()

    await openEditableField(page, 'link.title', uuid)
    const editor = plaintextEditor(page)
    await editor.waitFor({ state: 'visible' })
    await editor.fill('Gespeicherter Titel')
    await saveByClickAway(page)

    await expect
      .poll(() => storedFieldValue(page, uuid, 'link.title'))
      .toBe('Gespeicherter Titel')

    const item = (await blockItems()).find((i) => i.uuid === uuid)
    expect(item?.props.link).toMatchObject({
      uri: STORED_URI,
      title: 'Gespeicherter Titel',
    })
  })

  test('the agent reads the title at its property path', async () => {
    await openSidebar(page, 'test-cases')
    const result = await runAgentTool(page, 'get_content_fields', {
      uuids: [linkUuid],
      includeNested: false,
    })
    const field = result[linkUuid]?.['link.title']
    expect(field && 'currentValue' in field ? field.currentValue : null).toBe(
      STORED_TITLE,
    )
  })
})
