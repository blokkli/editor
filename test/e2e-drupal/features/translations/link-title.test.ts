import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { withApp } from '../../../e2e/support/session'
import {
  discardEditable,
  editableOverlay,
  openEditableField,
  plaintextEditor,
  saveByClickAway,
  storedFieldValue,
} from '../../../e2e/support/editable'
import { openSidebar } from '../../../e2e/support/sidebar'
import { runAgentTool } from '../../../e2e/support/agent'
import { nextMutation } from '../../support/mutations'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from '../../support/sandbox'
import { editorPath, openEditor } from '../../support/session'

// The page "Widgets" (content/nodes/widgets.yml).
const LINK = seedUuid('paragraph', 'widgets-link')
const OTHER_LINK = seedUuid('paragraph', 'widgets-other-link')
const BUTTON = seedUuid('paragraph', 'widgets-button')

/**
 * Text that lives INSIDE a non-text field, addressed by property path.
 *
 * The widget stores its link's title as a property of `field_link`, rather
 * than as a separate text field the way the `link` paragraph does. Such a
 * value is addressed as `<field>.<property>` — `field_link.title` — which is
 * the convention `paragraphs_blokkli` uses for writes
 * (`UpdateFieldValueTrait::updateTextFieldValue` splits on the dot and updates
 * only that property). Drupal offers it for a link field with a title and a
 * single value.
 *
 * The `link` paragraph is asserted alongside the widget throughout: it carries
 * the same two pieces of information in separate fields, so it is the control
 * proving these assertions are about the field SHAPE, not about the fixture
 * being absent.
 */
describe('link field titles', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  const STORED_TITLE = 'Read more about it'
  const STORED_URI = 'https://www.example.com'

  let page: Page

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

  async function linkProps(uuid: string): Promise<Record<string, any>> {
    const item = (await blockItems()).find((i) => i.uuid === uuid)
    return item?.props ?? {}
  }

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(
      sandbox,
      'Anna Keller',
      editorPath('/en/widgets', 'widgets'),
    )
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
    const el = page.locator(`[data-bk-uuid="${LINK}"]`)
    expect(await el.textContent()).toContain(STORED_TITLE)
  })

  test('the link value carries both uri and title', async () => {
    const props = await linkProps(LINK)
    expect(props.link).toMatchObject({
      uri: { path: STORED_URI },
      title: STORED_TITLE,
    })
  })

  test('the title is exposed as a text value at its property path', async () => {
    const values = await withApp(page, (app) =>
      app.fieldValue.getTextFieldValues(),
    )
    expect(values.some((v) => v.uuid === BUTTON)).toBe(true)

    const entry = values.find(
      (v) => v.uuid === LINK && v.fieldName === 'field_link.title',
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
      values.some((v) => v.uuid === LINK && v.fieldName.endsWith('.uri')),
    ).toBe(false)
  })

  test('the title is an editable field at its property path', async () => {
    const names = await withApp(page, (app) =>
      app.types.editableFieldConfig
        .forEntityTypeAndBundle('paragraph', 'widget')
        .map((c) => c.name),
    )
    expect(names).toContain('field_link.title')
  })

  test('readRawValue resolves the property path', async () => {
    const value = await page.evaluate(
      (uuid) =>
        window.__BLOKKLI__!.app!.fieldValue.readRawValue(
          'paragraph',
          uuid,
          'widget',
          'field_link.title',
          'plain',
        ),
      LINK,
    )
    expect(value).toBe(STORED_TITLE)
  })

  test('the live preview updates the title without dropping the uri', async () => {
    // The core of it: a prop override used to replace the whole `link` prop
    // with a bare string, destroying the uri. It has to merge into the object.
    await openEditableField(page, 'field_link.title', LINK)
    const editor = plaintextEditor(page)
    await editor.waitFor({ state: 'visible' })
    expect(await editor.inputValue()).toBe(STORED_TITLE)

    // The preview lives in `mutatedItemProps`, not the committed field list, so
    // assert what the block actually renders.
    const anchor = page.locator(`[data-bk-uuid="${LINK}"] a`)
    await editor.fill('Vorschau')

    await expect.poll(() => anchor.textContent()).toContain('Vorschau')
    expect(await anchor.getAttribute('href')).toBe(STORED_URI)

    const override = await withApp(
      page,
      (app) => app.state.mutatedItemProps as Record<string, any>,
    )
    expect(Object.values(override).find((v) => v?.link)?.link).toMatchObject({
      uri: { path: STORED_URI },
      title: 'Vorschau',
    })

    await discardEditable(page)
    await expect.poll(() => anchor.textContent()).toContain(STORED_TITLE)
  })

  test('saving writes only the title and keeps the uri', async () => {
    // A widget of its own: this one stores a change, so it must not disturb
    // the fixture the read-only cases share.
    await openEditableField(page, 'field_link.title', OTHER_LINK)
    const editor = plaintextEditor(page)
    await editor.waitFor({ state: 'visible' })
    await editor.fill('Gespeicherter Titel')
    const saved = nextMutation(page, 'pbUpdateFieldValue')
    await saveByClickAway(page)

    expect(await saved).toMatchObject({
      uuid: OTHER_LINK,
      fieldName: 'field_link.title',
      value: 'Gespeicherter Titel',
    })
    await expect
      .poll(() => storedFieldValue(page, OTHER_LINK, 'field_link.title'))
      .toBe('Gespeicherter Titel')

    // What Drupal stored: the uri is still there.
    expect((await linkProps(OTHER_LINK)).link).toMatchObject({
      uri: { path: STORED_URI },
      title: 'Gespeicherter Titel',
    })
  })

  test('the agent reads the title at its property path', async () => {
    await openSidebar(page, 'test-cases')
    const result = await runAgentTool(page, 'get_content_fields', {
      uuids: [LINK],
      includeNested: false,
    })
    const field = result[LINK]?.['field_link.title']
    expect(field && 'currentValue' in field ? field.currentValue : null).toBe(
      STORED_TITLE,
    )
  })
})
