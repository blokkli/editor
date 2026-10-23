import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Frame, Page } from 'playwright-core'
import { addBlock } from '../../support/blocks'
import {
  blockHost,
  discardButton,
  editableFrame,
  editableOverlay,
  editableText,
  openEditableField,
  saveByClickAway,
} from '../../support/editable'
import { getPreviewFrame } from '../../support/preview'
import { openSidebar } from '../../support/sidebar'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from '../../support/sandbox'
import { editorPath, openEditor } from '../../support/session'

// The first widget of the page "Widgets" (content/nodes/widgets.yml).
const WIDGET = seedUuid('paragraph', 'widgets-first')

const OTHER_TEXT = '<p>Text from another frame</p>'

/**
 * Post messages from a frame of its own, added to `host`, as a project's frame
 * in a block could: to `host`'s window, or to the frame `to` selects in it.
 * Resolves once they've been handled: a last message from the same frame
 * arrives after them.
 */
async function postFromOtherFrame(
  host: Frame,
  messages: object[],
  to?: string,
): Promise<void> {
  const other = await host.evaluateHandle((to) => {
    const iframe = document.createElement('iframe')
    iframe.dataset.test = 'other-frame'
    const target = to
      ? document.querySelector<HTMLIFrameElement>(to)!.contentWindow!
      : window
    target.addEventListener('message', function onMessage(e) {
      if (e.source === iframe.contentWindow && e.data === 'e2e:handled') {
        target.removeEventListener('message', onMessage)
        iframe.dataset.testHandled = 'true'
      }
    })
    document.body.appendChild(iframe)
    return iframe
  }, to)
  const frame = await other.contentFrame()
  if (!frame) {
    throw new Error('The other frame has no content frame')
  }
  await frame.evaluate(
    ({ messages, to }) => {
      const target = to
        ? window.parent.document.querySelector<HTMLIFrameElement>(to)!
            .contentWindow!
        : window.parent
      for (const message of messages) {
        target.postMessage(message, '*')
      }
      target.postMessage('e2e:handled', '*')
    },
    { messages, to },
  )
  await host
    .locator('[data-test="other-frame"][data-test-handled="true"]')
    .waitFor({ state: 'attached' })
  await other.evaluate((el) => el.remove())
}

/** The text in the open text field's CKEditor. */
function ckEditorData(frame: Frame): Promise<string> {
  return frame.evaluate(() => {
    const el = document.querySelector('.ck-editor__editable') as
      | (HTMLElement & { ckeditorInstance?: { getData(): string } })
      | null
    return el?.ckeditorInstance?.getData() ?? ''
  })
}

/**
 * X7 (plans/xss): the editor and the frames it opens took messages from any
 * window. Any frame on the page can post them: a project's embed in a block,
 * or a frame inside the previewed page. One could set the text a field saves,
 * or the options the preview renders. The editor now accepts a frame's
 * messages only from that frame, on the origin of its URL; the preview only
 * from the editor; Drupal's text field frame only from the editor.
 *
 * The messages here are plain text. That the editor's own messages still
 * arrive: `editable-field/frame` and `responsive-preview/base`.
 */
describe('XSS: messages from other windows (X7)', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page

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

  afterEach(async () => {
    // Nothing changed, so closing the field saves nothing.
    if (await editableOverlay(page).isVisible()) {
      await saveByClickAway(page)
      await editableOverlay(page).waitFor({ state: 'detached' })
    }
  })

  test("another frame can't set a text field's value", async () => {
    const uuid = (await addBlock(page, {
      bundle: 'text',
      fieldName: 'field_paragraphs',
    }))!
    const host = await blockHost(page, uuid)
    await openEditableField(page, 'field_text', uuid)
    const frame = await editableFrame(page)

    // What the text field's frame sends the editor.
    await postFromOtherFrame(page.mainFrame(), [
      {
        name: 'blokkli__editable_field_update',
        data: { text: OTHER_TEXT },
      },
      {
        name: 'blokkli__editable_field_update_formatted',
        data: { text: OTHER_TEXT },
      },
    ])
    expect(await discardButton(page).isDisabled()).toBe(true)
    expect(await editableText(page, 'field_text', host)).not.toContain(
      'another frame',
    )

    // What the editor sends the text field's frame.
    await postFromOtherFrame(
      page.mainFrame(),
      [
        {
          name: 'blokkli__editable_field_set_value',
          data: { text: OTHER_TEXT },
        },
      ],
      '[data-test="editable-frame"]',
    )
    expect(await ckEditorData(frame)).not.toContain('another frame')
    expect(await discardButton(page).isDisabled()).toBe(true)
  })

  test("a frame in the preview can't change what it renders", async () => {
    await openSidebar(page, 'mobile-preview')
    const preview = await getPreviewFrame(page)
    const rows = preview.locator(
      `[data-bk-uuid="${WIDGET}"] [data-test="widget-option-rows"]`,
    )
    await rows.waitFor({ state: 'attached' })
    expect((await rows.textContent())?.trim()).toBe('0')

    // What the editor sends the preview when an option changes.
    await postFromOtherFrame(preview, [
      {
        name: 'blokkli__updateOption',
        data: { uuid: WIDGET, key: 'rows', value: '7' },
      },
    ])
    expect((await rows.textContent())?.trim()).toBe('0')
  })
})
