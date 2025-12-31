import type { Rectangle } from './geometry'
import type { DraggableStyle } from './style'

export type SelectedRect = Rectangle & {
  uuid: string
  style: DraggableStyle
}
