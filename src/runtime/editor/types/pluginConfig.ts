/**
 * A condition on another input of the same form.
 */
export type PluginConfigInputCondition = {
  /**
   * The name of the other input.
   */
  name: string
  /**
   * Whether the other input, a checkbox, is checked, or the value the other
   * input has.
   */
  value: boolean | string
}

type PluginConfigInputConditions = {
  /**
   * If set, the input is only shown while the condition holds.
   */
  visibleIf?: PluginConfigInputCondition
  /**
   * If set, the input is required while the condition holds.
   */
  requiredIf?: PluginConfigInputCondition
}

export type PluginConfigInputText = PluginConfigInputConditions & {
  type: 'text'
  name: string
  label: string
  description?: string
  required: boolean
  defaultValue?: string
  minLength?: number
  maxLength?: number
  placeholder?: string
  pattern?: string
  multiline?: boolean
  rows?: number
}

export type PluginConfigInputSeed = PluginConfigInputConditions & {
  type: 'seed'
  name: string
  label: string
  description?: string
  required: boolean
}

export type PluginConfigInputCheckbox = PluginConfigInputConditions & {
  type: 'checkbox'
  name: string
  label: string
  description?: string
  required: boolean
  checkboxLabel?: string
  defaultValue: boolean
}

export type PluginConfigInputOptions = PluginConfigInputConditions & {
  type: 'options'
  name: string
  label: string
  description?: string
  required: boolean
  defaultValue?: string
  variant: 'select' | 'radio'
  options: { value: string; label: string }[]
}

/**
 * The point of an image that crops keep. It's shown on its image, by whatever
 * shows the image, not by the form.
 */
export type PluginConfigInputFocalPoint = PluginConfigInputConditions & {
  type: 'focalPoint'
  name: string
  label: string
  description?: string
  required: boolean
  /**
   * The point as "x,y": its offsets from the image's left and top edges, in
   * whole percent.
   */
  defaultValue?: string
}

export type PluginConfigInput =
  | PluginConfigInputText
  | PluginConfigInputSeed
  | PluginConfigInputCheckbox
  | PluginConfigInputOptions
  | PluginConfigInputFocalPoint

export type PluginConfigInputItem = {
  name: string
  value: string
}
