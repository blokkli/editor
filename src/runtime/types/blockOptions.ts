import type { BlokkliIcon } from '#blokkli-build/icons'
import type { ComplexOptionTypeMap } from '#blokkli-build/complex-option-types'
import type { BlockOptionDefinitionBase } from '../../global/types/blockOptions'

export type BlockOptionDefinition = BlockOptionDefinitionBase<
  BlokkliIcon,
  keyof ComplexOptionTypeMap
>
