export type StringBoolean = '0' | '1'

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

type DefinitionOptionRadios = {
  type: 'radios'
  label: string
  default: string
  displayAs?: 'radios' | 'colors' | 'grid'
  options: Record<string, string | number[]>
}

export type BlokkliDefinitionOption =
  | DefinitionOptionCheckbox
  | DefinitionOptionCheckboxes
  | DefinitionOptionRadios
  | DefinitionOptionText
