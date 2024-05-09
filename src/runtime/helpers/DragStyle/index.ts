import type { DraggableStyle } from '#blokkli/types'
import type { RGB } from '#blokkli/types/theme'
import {
  findHighestContrastColor,
  getContrastRatio,
  getNumericStyleValue,
  parseColorString,
  realBackgroundColor,
  rgbaToString,
} from '..'

export class DragStyle {
  styleCache: WeakMap<HTMLElement | SVGElement, DraggableStyle>
  backgroundCache: WeakMap<HTMLElement | SVGElement, string>

  constructor() {
    this.styleCache = new WeakMap()
    this.backgroundCache = new WeakMap()
  }

  invalidateStyle(el: HTMLElement | SVGElement) {
    this.styleCache.delete(el)
    this.backgroundCache.delete(el)
  }

  reset() {
    this.styleCache = new WeakMap()
    this.backgroundCache = new WeakMap()
  }

  getStyle(el: HTMLElement | SVGElement, accentColor: RGB): DraggableStyle {
    const cached = this.styleCache.get(el)
    if (cached) {
      return cached
    }
    const style = this.getDraggableStyle(el, accentColor)
    this.styleCache.set(el, style)
    return style
  }

  realBackgroundColor(el: HTMLElement | SVGElement | null): string {
    const transparent = 'rgba(0, 0, 0, 0)'
    if (!el) {
      return transparent
    }
    const cached = this.backgroundCache.get(el)
    if (cached) {
      return cached
    }

    let bg = getComputedStyle(el).backgroundColor
    if (bg === transparent || bg === 'transparent') {
      bg = realBackgroundColor(el.parentElement)
    }

    this.backgroundCache.set(el, bg)

    return bg
  }

  getDraggableStyle(
    el: HTMLElement | SVGElement,
    accentColor: RGB,
  ): DraggableStyle {
    const style = getComputedStyle(el)

    const radius: [number, number, number, number] = [
      getNumericStyleValue(style.borderTopLeftRadius, 0),
      getNumericStyleValue(style.borderTopRightRadius, 0),
      getNumericStyleValue(style.borderBottomRightRadius, 0),
      getNumericStyleValue(style.borderBottomLeftRadius, 0),
    ]
    const radiusMin = Math.min(...radius)

    const backgroundColorForSelection = parseColorString(
      realBackgroundColor(el.parentElement),
    )
    const contrastColor = findHighestContrastColor(
      [[255, 255, 255], accentColor],
      backgroundColorForSelection,
    )

    const backgroundColor = parseColorString(realBackgroundColor(el))
    const textColor = findHighestContrastColor(
      [
        [0, 0, 0],
        [255, 255, 255],
      ],
      backgroundColor,
    )
    const bg = backgroundColorForSelection || [255, 255, 255]
    const ratio = getContrastRatio(accentColor, bg)

    return {
      radius,
      radiusMin,
      radiusString: radius.map((v) => v + 'px').join(' '),
      contrastColor: rgbaToString(contrastColor),
      contrastColorRGB: contrastColor,
      contrastColorTranslucent: rgbaToString(contrastColor, 0.25),
      textColor: rgbaToString(textColor),
      isInverted: ratio < 5,
    }
  }
}
