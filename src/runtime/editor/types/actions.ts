import type { BlokkliIcon } from '#blokkli-build/icons'
import type {
  BlokkliFieldElement,
  DraggableHostData,
  RenderedFieldListItem,
} from '#blokkli/types'

export type AddActionColor = 'rose' | 'lime' | 'accent'

export type ActionPlacedData = {
  preceedingUuid: string | null
  host: DraggableHostData
  field: BlokkliFieldElement
}

export type AddAction = {
  id: string
  icon: BlokkliIcon
  color: AddActionColor
  itemBundle?: string
  title: string
  description?: string
  callback: (action: ActionPlacedData) => void
  enabled?: (item: RenderedFieldListItem) => boolean
}
