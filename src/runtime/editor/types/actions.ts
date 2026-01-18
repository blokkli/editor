import type { BlokkliIcon } from '#blokkli-build/icons'
import type {
  BlokkliFieldElement,
  BlokkliItemHost,
  RenderedFieldListItem,
} from './field'

export type AddActionColor = 'rose' | 'lime' | 'accent' | 'orange'

export type ActionPlacedData = {
  preceedingUuid: string | null
  host: BlokkliItemHost
  field: BlokkliFieldElement
}

export type AddAction = {
  id: string
  icon: BlokkliIcon
  color: AddActionColor
  itemBundle?: string
  title: string
  description?: string
  weight: number
  callback: (action: ActionPlacedData) => void
  enabled?: (item: RenderedFieldListItem) => boolean
}
