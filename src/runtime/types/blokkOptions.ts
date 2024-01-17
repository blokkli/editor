export type StringBoolean = '0' | '1' | ''

type DefinitionOptionText = {
  type: 'text'
  default: string
  label: string
  inputType?: 'text' | 'number' | 'date'
}

type DefinitionOptionCheckbox = {
  type: 'checkbox'
  default: StringBoolean
  label: string
}

type DefinitionOptionCheckboxes = {
  type: 'checkboxes'
  label: string
  /**
   * The default values, separated by comma.
   */
  default: string
  options: Record<string, string>
}

type DefinitionOptionRadiosGrid = {
  displayAs: 'grid'
  options: Record<string, number[]>
}

type DefinitionOptionRadiosColors = {
  displayAs: 'colors'
  options: Record<string, string>
}

type DefinitionOptionRadiosRadios = {
  displayAs?: 'radios' | undefined
  options: Record<string, string>
}

type DefinitionOptionRadiosIcons = {
  displayAs: 'icons'
  options: Record<string, `icon-blokkli-option-${string}`>
}

type DefinitionOptionRadios = {
  type: 'radios'
  label: string
  default: string
} & (
  | DefinitionOptionRadiosColors
  | DefinitionOptionRadiosGrid
  | DefinitionOptionRadiosRadios
  | DefinitionOptionRadiosIcons
)

export type BlockOptionDefinition =
  | DefinitionOptionCheckbox
  | DefinitionOptionCheckboxes
  | DefinitionOptionRadios
  | DefinitionOptionText
