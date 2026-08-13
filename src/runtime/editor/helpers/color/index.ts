import type { RGB } from './../../../../global/types/theme'

export function toShaderColor(rgba: RGB): RGB {
  return rgba.map((v) => v / 255) as RGB
}

export const rgbaToString = (color: RGB, alpha = 1): string =>
  `rgba(${[...color, alpha].join(', ')})`

export function getContrastRatio(color1: RGB, color2: RGB): number {
  const luminance1 = getLuminance(color1)
  const luminance2 = getLuminance(color2)

  const lighter = Math.max(luminance1, luminance2)
  const darker = Math.min(luminance1, luminance2)

  return (lighter + 0.05) / (darker + 0.05)
}

function getLuminance(color: RGB): number {
  const [r, g, b] = color.map((val) => {
    val /= 255
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4)
  }) as [number, number, number]

  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function findHighestContrastColor(
  colors: RGB[],
  backgroundColor: RGB = [255, 255, 255],
): RGB {
  let maxContrast = 0
  let maxContrastColor: RGB = colors[0]!

  for (const color of colors) {
    const contrast = getContrastRatio(color, backgroundColor)
    if (contrast > maxContrast) {
      maxContrast = contrast
      maxContrastColor = color
    }
  }

  return maxContrastColor
}

export const hexToRgb = (hex: string): RGB | undefined => {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!match) return
  return [
    Number.parseInt(match[1]!, 16),
    Number.parseInt(match[2]!, 16),
    Number.parseInt(match[3]!, 16),
  ]
}

/**
 * Whether the given hex color is "light" — i.e. dark text on top of it would
 * be more readable than light text. Use this to decide between black/white
 * foreground content on a colored background. Unparseable hex → `false`.
 */
export const isLightHex = (hex: string): boolean => {
  const rgb = hexToRgb(hex)
  if (!rgb) return false
  return (
    getContrastRatio(rgb, [0, 0, 0]) > getContrastRatio(rgb, [255, 255, 255])
  )
}

export const parseColorString = (color: string): RGB | undefined => {
  const rgbaRegex =
    /^rgba?\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})(?:,\s*(0|1|0?\.\d+))?\)$/

  const match = color.match(rgbaRegex)
  if (!match) {
    return
  }

  const r = Number.parseInt(match[1]!)
  const g = Number.parseInt(match[2]!)
  const b = Number.parseInt(match[3]!)
  const a = match[4] !== undefined ? Number.parseFloat(match[4]) : 1

  if ([r, g, b, a].some((val) => Number.isNaN(val))) {
    throw new Error('Invalid color values')
  }

  if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) {
    return
  }

  return [r, g, b]
}
