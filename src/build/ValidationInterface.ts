import type { IconCollector } from './Collector/Icons'

export interface ValidationInterface {
  validate(icons: IconCollector): boolean
}
