export type StringBoolean = '0' | '1'

type ParagraphDefinitionOptionText = {
  type: 'text'
  default: string
  label: string
  inputType?: 'text' | 'number' | 'date'
}

type ParagraphDefinitionOptionCheckbox = {
  type: 'checkbox'
  default: StringBoolean
  label: string
}

type ParagraphDefinitionOptionCheckboxes = {
  type: 'checkboxes'
  label: string
  /**
   * The default values, separated by comma.
   */
  default: string
  options: Record<string, string>
}

type ParagraphDefinitionOptionRadios = {
  type: 'radios'
  label: string
  default: string
  displayAs?: 'radios' | 'colors' | 'grid'
  options: Record<string, string | number[]>
}

export type ParagraphDefinitionOption =
  | ParagraphDefinitionOptionCheckbox
  | ParagraphDefinitionOptionCheckboxes
  | ParagraphDefinitionOptionRadios
  | ParagraphDefinitionOptionText
