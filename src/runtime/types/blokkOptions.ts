type DefinitionOptionText = {
  type: 'text'
  default: string
  label: string
  inputType?: 'text' | 'number' | 'date'
}

type DefinitionOptionCheckbox = {
  type: 'checkbox'
  default: boolean
  label: string
}

type DefinitionOptionCheckboxes = {
  type: 'checkboxes'
  label: string
  /**
   * The default values.
   */
  default: string[]
  options: Record<string, string>
}

type DefinitionOptionRadiosGridOption = {
  columns: number[]
  label: string
}

type DefinitionOptionRadiosGrid = {
  displayAs: 'grid'
  options: Record<string, DefinitionOptionRadiosGridOption>
}

type DefinitionOptionRadiosColorsOption = {
  hex?: `#${string}`
  class?: string
  label: string
}

type DefinitionOptionRadiosColors = {
  displayAs: 'colors'
  options: Record<string, DefinitionOptionRadiosColorsOption>
}

type DefinitionOptionRadiosRadios = {
  displayAs?: 'radios' | undefined
  options: Record<string, string>
}

type DefinitionOptionRadiosIconsOption = {
  icon: `icon-blokkli-option-${string}`
  label: string
}

type DefinitionOptionRadiosIcons = {
  displayAs: 'icons'
  options: Record<string, DefinitionOptionRadiosIconsOption>
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
