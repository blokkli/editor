import charData from './charmap.txt?raw'

type TextAlign = 'left' | 'center' | 'right'

type UseTextRendering = {
  drawTextPixels: (
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    color: string,
    align?: TextAlign,
    scale?: number,
  ) => void

  drawText: (
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    color: string,
    backgroundColor?: string,
    borderSize?: number,
    padding?: number,
    scale?: number,
  ) => void

  getTextWidth: (text: string) => number
}

type Char = {
  pattern: boolean[][]
  width: number
}

type CharAtlas = {
  x: number
  y: number
  width: number
}

type FontData = Map<string, Char>

// Decode font patterns from readable format
function decodeFontData(encodedData: string): FontData {
  const patterns = new Map<string, Char>()

  const lines = encodedData.trim().split('\n')

  for (const line of lines) {
    const [char, widthStr, binary] = line.split(',')
    if (!char || !widthStr || !binary) continue

    const width = Number.parseInt(widthStr, 10)

    // Pad binary string back to width × 8 with trailing zeros
    const expectedLength = width * 8
    const paddedBinary = binary.padEnd(expectedLength, '0')

    // Decode binary string to pattern (width × 8 pixels)
    const pattern: boolean[][] = []
    for (let row = 0; row < 8; row++) {
      pattern[row] = []
      for (let col = 0; col < width; col++) {
        const index = row * width + col
        pattern[row]![col] = paddedBinary[index] === '1'
      }
    }

    patterns.set(char, { pattern, width })
  }

  return patterns
}

export function useTextRendering(): UseTextRendering {
  const fontPatterns = decodeFontData(charData)
  const charHeight = 8

  // Create character atlas - offscreen canvas with all pre-rendered characters
  const charAtlas = new Map<string, CharAtlas>()
  const atlasCanvas = document.createElement('canvas')

  // Calculate total atlas width needed
  let totalWidth = 0
  fontPatterns.forEach((data) => {
    totalWidth += data.width + 1 // Add 1px spacing between characters
  })

  atlasCanvas.width = totalWidth
  atlasCanvas.height = charHeight
  const atlasCtx = atlasCanvas.getContext('2d')!

  // Render all characters to atlas
  let currentX = 0
  fontPatterns.forEach((data, char) => {
    // Store character position in atlas
    charAtlas.set(char, {
      x: currentX,
      y: 0,
      width: data.width,
    })

    // Draw character to atlas
    atlasCtx.fillStyle = 'black'
    for (let py = 0; py < charHeight; py++) {
      for (let px = 0; px < data.width; px++) {
        const isPixelOn = data.pattern[py]?.[px] ?? false
        if (isPixelOn) {
          atlasCtx.fillRect(currentX + px, py, 1, 1)
        }
      }
    }

    currentX += data.width + 1
  })

  function drawTextPixels(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    color: string,
    align: TextAlign = 'left',
    scale = 1,
  ) {
    const textWidth = getTextWidth(text) * scale

    // Calculate starting X based on alignment
    let startX = x
    if (align === 'right') {
      startX = x - textWidth
    } else if (align === 'center') {
      startX = x - Math.floor(textWidth / 2)
    }

    ctx.fillStyle = color
    let currentX = startX

    ctx.imageSmoothingEnabled = false
    text.split('').forEach((char) => {
      if (char === ' ') {
        currentX += 3 * scale
        return
      }

      const atlasData = charAtlas.get(char)
      if (!atlasData) return

      // Draw character from atlas using drawImage
      ctx.drawImage(
        atlasCanvas,
        atlasData.x,
        atlasData.y,
        atlasData.width,
        charHeight, // source
        currentX,
        y,
        atlasData.width * scale,
        charHeight * scale, // destination
      )
      currentX += (atlasData.width + 1) * scale
    })
    ctx.imageSmoothingEnabled = true
  }

  // Helper to calculate text width in pixels
  function getTextWidth(text: string): number {
    let width = 0
    text.split('').forEach((char, index) => {
      if (char === ' ') {
        width += 3
      } else {
        const atlasData = charAtlas.get(char)
        if (atlasData) {
          width += atlasData.width
          if (index < text.length - 1) {
            width += 1 // Add spacing between characters
          }
        }
      }
    })
    return width
  }

  function drawText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    color: string,
    backgroundColor?: string,
    borderSize = 0,
    padding = 0,
    scale = 1,
  ) {
    const charHeight = 8
    const textWidth = getTextWidth(text) * scale
    const textHeight = charHeight * scale

    if (backgroundColor || borderSize > 0) {
      const totalWidth = textWidth + padding * 2 + borderSize * 2
      const totalHeight = textHeight + padding * 2 + borderSize * 2

      // Draw border
      if (borderSize > 0) {
        ctx.fillStyle = 'black'
        ctx.fillRect(
          x - padding - borderSize,
          y - (padding + borderSize),
          totalWidth,
          totalHeight,
        )
      }

      // Draw background
      if (backgroundColor) {
        ctx.fillStyle = backgroundColor
        ctx.fillRect(
          x - padding - borderSize + borderSize,
          y - (padding + borderSize) + borderSize,
          totalWidth - borderSize * 2,
          totalHeight - borderSize * 2,
        )
      }
    }

    drawTextPixels(ctx, text, x, y, color, 'left', scale)
  }

  return {
    getTextWidth,
    drawTextPixels,
    drawText,
  }
}
