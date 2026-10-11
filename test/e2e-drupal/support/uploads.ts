import type { Locator, Page } from 'playwright-core'
import { withApp } from './session'
import { dialog } from './overlays'

// Files for the upload dialog, and the dialog itself.
//
// The files are built in the page: images drawn on a canvas, so Drupal takes
// them as images. A broken one is zeros, which Drupal refuses.

/**
 * A file to upload. Images of the same `color` and type have the same content,
 * which makes the later ones duplicates (the sandbox has filehash). Without a
 * colour, an image gets random ones, and is no other's duplicate.
 */
export type TestFile = {
  name: string
  type: string
  broken?: boolean
  color?: string
}

/**
 * Build the files in the page and hand them over: as a synthetic `paste`, as
 * the files picked in a file input, or as a drag from outside the browser
 * dropped on an element. Both are selected by their `data-test`.
 */
function provideFiles(
  page: Page,
  files: TestFile[],
  target: { input?: string; drop?: string } = {},
): Promise<void> {
  return page.evaluate(
    async ({ files, input, drop }) => {
      const dt = new DataTransfer()
      const randomColor = () =>
        `rgb(${[0, 1, 2].map(() => Math.floor(Math.random() * 256)).join(' ')})`
      for (const { name, type, broken, color } of files) {
        let blob: Blob
        if (broken) {
          blob = new Blob([new Uint8Array(64)], { type })
        } else if (type.startsWith('image/')) {
          const canvas = document.createElement('canvas')
          canvas.width = 40
          canvas.height = 30
          const context = canvas.getContext('2d')!
          // Four stripes: with a single random colour, two images of a run
          // could well be the same.
          for (let stripe = 0; stripe < 4; stripe++) {
            context.fillStyle = color ?? randomColor()
            context.fillRect(stripe * 10, 0, 10, 30)
          }
          blob = await new Promise<Blob>((resolve) =>
            canvas.toBlob((v) => resolve(v!), type),
          )
        } else {
          blob = new Blob([`%PDF-1.4 ${Math.random()}`], { type })
        }
        dt.items.add(new File([blob], name, { type }))
      }
      if (drop) {
        const element = document.querySelector(`[data-test="${drop}"]`)
        if (!element) {
          throw new Error(`No element "${drop}" to drop on`)
        }
        for (const type of ['dragenter', 'dragover', 'drop']) {
          element.dispatchEvent(
            new DragEvent(type, {
              dataTransfer: dt,
              bubbles: true,
              cancelable: true,
            }),
          )
        }
        return
      }
      if (!input) {
        document.dispatchEvent(
          new ClipboardEvent('paste', {
            clipboardData: dt,
            bubbles: true,
            cancelable: true,
          }),
        )
        return
      }
      const element = document.querySelector<HTMLInputElement>(
        `[data-test="${input}"]`,
      )
      if (!element) {
        throw new Error(`No file input "${input}"`)
      }
      element.files = dt.files
      element.dispatchEvent(new Event('change', { bubbles: true }))
    },
    { files, ...target },
  )
}

/** Dispatch a synthetic `paste` carrying the files. */
export function pasteFiles(page: Page, files: TestFile[]): Promise<void> {
  return provideFiles(page, files)
}

/** Pick the files in a file input, selected by its `data-test`. */
export function pickFiles(
  page: Page,
  input: string,
  files: TestFile[],
): Promise<void> {
  return provideFiles(page, files, { input })
}

/**
 * Drag the files in from outside the browser and drop them on an element,
 * selected by its `data-test`.
 */
export function dropFiles(
  page: Page,
  target: string,
  files: TestFile[],
): Promise<void> {
  return provideFiles(page, files, { drop: target })
}

export function uploadDialog(page: Page): Locator {
  return dialog(page, 'upload')
}

/** The status of each file in the upload dialog. */
export function uploadStatuses(page: Page): Promise<string[]> {
  return uploadDialog(page)
    .locator('[data-test="upload-item"]')
    .evaluateAll((items) =>
      items.map((item) => item.getAttribute('data-test-status') ?? ''),
    )
}

/** The text input of a field of the upload dialog's forms, one per file. */
export function uploadField(page: Page, name: string): Locator {
  return uploadDialog(page).locator(
    `[data-test="config-form-${name}"] [data-test="form-text-input"]`,
  )
}

/** The IDs of the drop areas the in-flight drag can be dropped on. */
export function dropAreaIds(page: Page): Promise<string[]> {
  return withApp(page, (app) =>
    app.dragdrop
      .getDropAreas([...app.selection.dragItems.value])
      .map((area) => area.id),
  )
}

/**
 * Drop the in-flight drag on a drop area, as the dragging overlay does once
 * its pointer hit-test picked the area (see `clipboard.ts`).
 */
export function dropOnArea(page: Page, id: string): Promise<void> {
  return page.evaluate((id) => {
    const app = window.__BLOKKLI__!.app!
    const area = app.dragdrop
      .getDropAreas([...app.selection.dragItems.value])
      .find((v) => v.id === id)
    if (!area) {
      throw new Error(`No drop area "${id}"`)
    }
    area.onDrop()
  }, id)
}
