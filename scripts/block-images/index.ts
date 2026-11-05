/**
 * Takes the pictures that the editor's add list shows of the sandbox's block
 * types: `image.png` next to each block's component. Each is a block of the
 * page "Blöcke" (sandbox/drupal/content/nodes/blocks.yml) in German, rendered
 * on its own by the frontend's dev server (app/pages/block-image).
 *
 * On the host, with ddev running and the German template baked:
 *
 *   bun run sandbox:block-images [bundle…]
 *
 * It works in a sandbox of its own, so the dev site stays as it is.
 *
 * A picture has 600 × 400 pixels and is shown at 300 × 200: 300 CSS pixels
 * across the picture show a block at its own size. A block that doesn't fit is
 * shown smaller, as little as it has to be. The picture is centred on what the
 * block shows (its text, images, backgrounds and borders), and the browser
 * draws it at the picture's size instead of shrinking a screenshot.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium, type Browser, type Cookie, type Page } from 'playwright-core'
import { seedUuid } from '../../test/e2e-drupal/support/sandbox'

const SANDBOX = 'blockimages'
const HOST = `https://${SANDBOX}.blokkli.ddev.site`
const COMPONENTS = fileURLToPath(
  new URL('../../sandbox/frontend/app/components/Paragraph/', import.meta.url),
)
const ROOT = fileURLToPath(new URL('../../', import.meta.url))

/** The window's height: enough for every block. */
const WINDOW_HEIGHT = 2000

type Picture = {
  /** The key of the block on the page "Blöcke". */
  key: string

  /**
   * The width of the window that the page is laid out for: as narrow as the
   * block's layout allows, so that it's shown as large as possible.
   */
  layout: number

  /**
   * How wide the block is, for one that's narrower on pages than on its own
   * (a teaser, one of several there). It then takes that width, without a
   * container of its own.
   */
  blockWidth?: number

  /**
   * How many CSS pixels the picture shows across. By default, what the block
   * shows, with some space around it, at least 300 (its own size) and at most
   * the window's width. Less shows a part of a large block, larger: a table's
   * first columns tell what it is as well as all of it.
   */
  width?: number

  /**
   * Which part of the block the picture shows: its middle, or its start (its
   * left edge), for a block whose start tells what it is: a banner's icon, a
   * table's first column. A block taller than the picture is shown from its
   * top.
   */
  align?: 'center' | 'start'

  /** What to do before the picture is taken. */
  prepare?: (page: Page) => Promise<void>
}

const BLOCKS: Record<string, Picture> = {
  accordion: {
    key: 'blocks-accordion',
    layout: 450,
    prepare: (page) => page.locator('button[aria-expanded="false"]').click(),
  },
  banner: { key: 'notice-banner', layout: 1200, width: 300, align: 'start' },
  call_to_action: { key: 'blocks-call-to-action', layout: 600 },
  chart: { key: 'blocks-chart', layout: 600 },
  columns: { key: 'blocks-columns', layout: 780, width: 600, align: 'start' },
  contact: { key: 'blocks-contact', layout: 450 },
  // Its start: the calculator's title and first fields.
  embed: { key: 'blocks-embed', layout: 900, width: 600, align: 'start' },
  gallery: { key: 'blocks-gallery', layout: 600, blockWidth: 450 },
  image: { key: 'blocks-image', layout: 600 },
  link: { key: 'blocks-link', layout: 600 },
  link_list: { key: 'blocks-link-list', layout: 450 },
  section: { key: 'blocks-section', layout: 780, width: 510, align: 'start' },
  // On pages, it's in the steps' container and their list, which has no
  // markers (Tailwind's preflight).
  step: {
    key: 'blocks-step',
    layout: 450,
    blockWidth: 390,
    prepare: async (page) => {
      await page.addStyleTag({ content: 'li { list-style: none; }' })
    },
  },
  steps: { key: 'blocks-steps', layout: 450 },
  table: { key: 'blocks-table', layout: 600, width: 360, align: 'start' },
  teaser: { key: 'blocks-teaser', layout: 1200, blockWidth: 330, width: 570 },
  teaser_list: {
    key: 'blocks-teaser-list',
    layout: 900,
    width: 600,
    align: 'start',
  },
  text: { key: 'blocks-text', layout: 450 },
  title: { key: 'blocks-title', layout: 600 },
}

type Box = { left: number; top: number; right: number; bottom: number }

function ddev(...args: string[]): string {
  return execFileSync('ddev', args, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim()
}

/** The folder of a block type's component: `call_to_action` → `CallToAction`. */
function componentFolder(bundle: string): string {
  return bundle
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

/** The width and height of a PNG file, from its header. */
function pngSize(path: string): [number, number] {
  const header = readFileSync(path).subarray(16, 24)
  return [header.readUInt32BE(0), header.readUInt32BE(4)]
}

/**
 * Opens the block in a window of its own, at the given pixel ratio, and
 * returns the box of what it shows.
 */
async function openBlock(
  browser: Browser,
  cookies: Cookie[],
  picture: Picture,
  deviceScaleFactor: number,
): Promise<{ page: Page; box: Box }> {
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: picture.layout, height: WINDOW_HEIGHT },
    deviceScaleFactor,
    reducedMotion: 'reduce',
  })
  await context.addCookies(cookies)
  const page = await context.newPage()
  const query = picture.blockWidth ? `?width=${picture.blockWidth}` : ''
  await page.goto(
    `${HOST}/de/block-image/${seedUuid('paragraph', picture.key)}${query}`,
    { waitUntil: 'networkidle', timeout: 60_000 },
  )
  const block = page.locator('[data-test="block-image"]')
  await block.waitFor()
  // The dev server's DevTools button.
  await page.addStyleTag({
    content: '#nuxt-devtools-container { display: none !important; }',
  })
  await picture.prepare?.(page)
  // The web fonts and the images, then what's drawn after them (a chart).
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all(
      [...document.images].map((image) => image.decode().catch(() => {})),
    )
  })
  await page.waitForTimeout(1000)
  return { page, box: await block.evaluate(measure) }
}

/**
 * The box of what an element shows: its text, its images and what has a
 * background or a border, within what clips it. In page coordinates.
 */
function measure(root: Element): Box {
  const box = {
    left: Infinity,
    top: Infinity,
    right: -Infinity,
    bottom: -Infinity,
  }

  // The part of a rectangle that the element's ancestors don't clip.
  const visible = (rect: DOMRect, element: Element | null) => {
    let { left, top, right, bottom } = rect
    for (
      let parent = element;
      parent && parent !== document.body;
      parent = parent.parentElement
    ) {
      const style = getComputedStyle(parent)
      if (style.overflowX !== 'visible' || style.overflowY !== 'visible') {
        const clip = parent.getBoundingClientRect()
        left = Math.max(left, clip.left)
        top = Math.max(top, clip.top)
        right = Math.min(right, clip.right)
        bottom = Math.min(bottom, clip.bottom)
      }
    }
    return { left, top, right, bottom }
  }

  const add = (rect: DOMRect, element: Element | null) => {
    const part = visible(rect, element)
    // Visually hidden text is a pixel in size.
    if (part.right - part.left <= 1 || part.bottom - part.top <= 1) {
      return
    }
    box.left = Math.min(box.left, part.left)
    box.top = Math.min(box.top, part.top)
    box.right = Math.max(box.right, part.right)
    box.bottom = Math.max(box.bottom, part.bottom)
  }

  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
  )
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node instanceof Text) {
      if (node.textContent?.trim()) {
        const range = document.createRange()
        range.selectNodeContents(node)
        for (const rect of range.getClientRects()) {
          add(rect, node.parentElement)
        }
      }
      continue
    }
    const element = node as Element
    const style = getComputedStyle(element)
    if (style.visibility === 'hidden' || style.opacity === '0') {
      continue
    }
    // A white background doesn't show on the white page.
    const shows =
      ['IMG', 'svg', 'CANVAS', 'IFRAME', 'VIDEO'].includes(element.tagName) ||
      !['rgba(0, 0, 0, 0)', 'rgb(255, 255, 255)'].includes(
        style.backgroundColor,
      ) ||
      style.backgroundImage !== 'none' ||
      ['top', 'right', 'bottom', 'left'].some(
        (side) =>
          parseFloat(style.getPropertyValue(`border-${side}-width`)) > 0,
      )
    if (shows) {
      add(element.getBoundingClientRect(), element.parentElement)
    }
  }

  return {
    left: box.left + window.scrollX,
    top: box.top + window.scrollY,
    right: box.right + window.scrollX,
    bottom: box.bottom + window.scrollY,
  }
}

/**
 * How many CSS pixels the picture shows across: what the block shows takes up
 * at most 5/6 of the picture's width and height. A multiple of 30, so that the
 * picture has exactly 600 × 400 pixels.
 */
function pictureWidth(picture: Picture, box: Box): number {
  const fit = Math.max(
    300,
    (box.right - box.left) * 1.2,
    (box.bottom - box.top) * 1.2 * 1.5,
  )
  return Math.min(Math.ceil((picture.width ?? fit) / 30) * 30, picture.layout)
}

/**
 * The part of the page that the picture shows, and how far the block is moved
 * across for it: a picture wider than the space beside the block would reach
 * past the window's edge. A block that reaches the edges itself (a banner's
 * background) stays, and the picture ends at the edge.
 */
function clip(picture: Picture, box: Box, width: number) {
  const height = (width * 2) / 3
  let x =
    picture.align === 'start'
      ? box.left - width / 12
      : (box.left + box.right - width) / 2
  // Centred, or from its top if it's taller than the picture.
  const y =
    box.bottom - box.top <= height
      ? (box.top + box.bottom - height) / 2
      : box.top - height / 12

  const edge = picture.layout - width
  let shift = 0
  if (box.left <= 0 || box.right >= picture.layout) {
    x = Math.min(Math.max(x, 0), edge)
  } else if (x < 0) {
    shift = -x
    x = 0
  } else if (x > edge) {
    shift = edge - x
    x = edge
  }
  return { area: { x, y: Math.max(y, 0), width, height }, shift }
}

const bundles =
  process.argv.length > 2 ? process.argv.slice(2) : Object.keys(BLOCKS)
const unknown = bundles.filter((bundle) => !BLOCKS[bundle])
if (unknown.length) {
  throw new Error(`No block for: ${unknown.join(', ')}`)
}

if (ddev('drush', 'blokkli-sandbox:list').includes(SANDBOX)) {
  ddev('drush', 'blokkli-sandbox:delete', SANDBOX)
}
ddev('drush', 'blokkli-sandbox:create', SANDBOX, '--source=de')

const browser = await chromium.launch()
try {
  // The site is private: the admin's session, for every window.
  const session = await browser.newContext({ ignoreHTTPSErrors: true })
  await (
    await session.newPage()
  ).goto(ddev('drush', `--uri=${HOST}`, 'user:login', '--no-browser'))
  const cookies = await session.cookies()
  await session.close()

  for (const bundle of bundles) {
    const picture = BLOCKS[bundle]!
    // Measured at its own size first: how much the picture shows decides the
    // pixel ratio of the window that it's taken in.
    const first = await openBlock(browser, cookies, picture, 1)
    const width = pictureWidth(picture, first.box)
    await first.page.context().close()

    const { page, box } = await openBlock(
      browser,
      cookies,
      picture,
      600 / width,
    )
    const { area, shift } = clip(picture, box, width)
    // Moved without changing its layout.
    await page.locator('[data-test="block-image"]').evaluate((block, shift) => {
      ;(block as HTMLElement).style.transform = `translateX(${shift}px)`
    }, shift)
    const path = `${COMPONENTS}${componentFolder(bundle)}/image.png`
    await page.screenshot({ path, clip: area })
    await page.context().close()

    const [w, h] = pngSize(path)
    if (w !== 600 || h !== 400) {
      throw new Error(`${path} has ${w} × ${h} pixels, not 600 × 400.`)
    }
    console.log(`${bundle}: ${width} CSS pixels across, ${path}`)
  }
} finally {
  await browser.close()
  ddev('drush', 'blokkli-sandbox:delete', SANDBOX)
}
