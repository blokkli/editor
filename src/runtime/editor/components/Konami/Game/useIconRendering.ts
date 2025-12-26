import type { BlokkliIcon } from '#blokkli-build/icons'
import { useBlokkli } from '#imports'

type IconAtlas = {
  x: number
  y: number
}

// Array of icon names to use
const ICON_NAMES = [
  'bk_mdi_upload',
  'bk_mdi_school-fill',
  'bk_mdi_bug_report',
  'bk_mdi_bar_chart',
  'bk_mdi_visibility',
  'bk_mdi_person',
  'bk_mdi_add',
  'bk_mdi_robot',
  'bk_mdi_drag_pan',
  'bk_mdi_check',
  'bk_mdi_construction',
  'bk_mdi_undo',
  'bk_mdi_extension',
  'bk_mdi_stack_group',
  'bk_mdi_attach_file',
  'bk_mdi_comment',
  'bk_mdi_keyboard_command_key',
  'bk_mdi_close',
  'bk_mdi_trackpad_input',
] as const satisfies readonly BlokkliIcon[]

// Derive type from array
type IconName = (typeof ICON_NAMES)[number]

type UseIconRendering = {
  initIcons: () => Promise<void>
  drawIcon: (
    ctx: CanvasRenderingContext2D,
    icon: IconName | number,
    x: number,
    y: number,
    large?: boolean,
  ) => void
  getIconCount: () => number
}

export function useIconRendering(
  cellSize: number,
  largeSize: number,
): UseIconRendering {
  const { icons } = useBlokkli()

  // Build icon list from the names array
  const iconList = ICON_NAMES.map((name) => ({
    name,
    svg: icons.icons.value[name],
  }))

  const iconAtlas = new Map<string, IconAtlas>()
  const iconAtlasLarge = new Map<string, IconAtlas>()
  const atlasCanvas = document.createElement('canvas')
  atlasCanvas.width = cellSize * iconList.length
  atlasCanvas.height = cellSize

  const atlasCanvasLarge = document.createElement('canvas')
  atlasCanvasLarge.width = largeSize * iconList.length
  atlasCanvasLarge.height = largeSize

  async function initIcons() {
    const ctx = atlasCanvas.getContext('2d', { willReadFrequently: true })
    const ctxLarge = atlasCanvasLarge.getContext('2d', {
      willReadFrequently: true,
    })
    if (!ctx || !ctxLarge) return

    // Load all images in parallel
    const imagePromises = iconList.map(({ name, svg }) => {
      return new Promise<{ name: string; img: HTMLImageElement }>((resolve) => {
        const img = new Image()
        const svgBlob = new Blob([svg], { type: 'image/svg+xml' })
        const url = URL.createObjectURL(svgBlob)

        img.onload = () => {
          URL.revokeObjectURL(url)
          resolve({ name, img })
        }

        img.src = url
      })
    })

    const loadedImages = await Promise.all(imagePromises)

    // Helper function to process icon at a specific size
    const processIcon = (
      img: HTMLImageElement,
      name: string,
      index: number,
      size: number,
      targetCtx: CanvasRenderingContext2D,
      atlasMap: Map<string, IconAtlas>,
    ) => {
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = size
      tempCanvas.height = size
      const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true })
      if (!tempCtx) return

      // Clear temp canvas
      tempCtx.clearRect(0, 0, size, size)

      // Draw SVG to temp canvas
      tempCtx.drawImage(img, 0, 0, size, size)

      // Get image data and apply 1-bit conversion
      const imageData = tempCtx.getImageData(0, 0, size, size)
      const data = imageData.data

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]!
        const g = data[i + 1]!
        const b = data[i + 2]!
        const a = data[i + 3]!
        const brightness = (r + g + b) / 3

        if (a > 128 && brightness < 128) {
          data[i] = 0
          data[i + 1] = 0
          data[i + 2] = 0
          data[i + 3] = 255
        } else {
          data[i] = 0
          data[i + 1] = 0
          data[i + 2] = 0
          data[i + 3] = 0
        }
      }

      tempCtx.putImageData(imageData, 0, 0)

      // Copy to atlas at correct position
      const atlasX = index * size
      targetCtx.drawImage(tempCanvas, 0, 0, size, size, atlasX, 0, size, size)

      // Store position in atlas
      atlasMap.set(name, { x: atlasX, y: 0 })
    }

    // Process each image at both sizes
    loadedImages.forEach(({ name, img }, index) => {
      // Process small size
      processIcon(img, name, index, cellSize, ctx, iconAtlas)
      // Process large size
      processIcon(img, name, index, largeSize, ctxLarge, iconAtlasLarge)
    })
  }

  function drawIcon(
    ctx: CanvasRenderingContext2D,
    icon: IconName | number,
    x: number,
    y: number,
    large = false,
  ) {
    let iconName: string
    if (typeof icon === 'number') {
      const iconData = iconList[icon]
      if (!iconData) return
      iconName = iconData.name
    } else {
      iconName = icon
    }

    const atlas = large ? iconAtlasLarge : iconAtlas
    const canvas = large ? atlasCanvasLarge : atlasCanvas
    const size = large ? largeSize : cellSize

    const atlasData = atlas.get(iconName)
    if (!atlasData) return

    const prevSmoothing = ctx.imageSmoothingEnabled
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(
      canvas,
      atlasData.x,
      atlasData.y,
      size,
      size,
      x,
      y,
      size,
      size,
    )
    ctx.imageSmoothingEnabled = prevSmoothing
  }

  function getIconCount() {
    return iconList.length
  }

  return {
    initIcons,
    drawIcon,
    getIconCount,
  }
}
