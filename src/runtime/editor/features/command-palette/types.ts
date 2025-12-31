import type { BlokkliIcon } from '#blokkli-build/icons'

export type CommandGroup =
  | 'ui'
  | 'selection'
  | 'add'
  | 'action'
  | 'misc'
  | 'options'

export type Command = {
  id: string
  label: string
  group?: CommandGroup
  icon?: BlokkliIcon
  bundle?: string
  disabled?: boolean
  callback: () => any
}
