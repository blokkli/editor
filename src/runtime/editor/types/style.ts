import type { RGB } from './../../../global/types/theme'

export type DraggableStyle = {
  /**
   * The border radius for every corner, starting from top left.
   */
  radius: [number, number, number, number]

  /**
   * The smallest radius of the element.
   */
  radiusMin: number

  /**
   * The border radius as a CSS property value.
   */
  radiusString: string

  /**
   * The contrast color for highlighting.
   */
  contrastColor: string

  /**
   * The translucent contrast color for highlighting.
   */
  contrastColorTranslucent: string

  /**
   * The color to make a text (mostly) readable when put on top of the element.
   */
  textColor: string

  contrastColorRGB: RGB
  isInverted: boolean
}
