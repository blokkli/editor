export type PluginConfigInputText = {
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

export type PluginConfigInputSeed = {
  type: 'seed'
  name: string
  label: string
  description?: string
  required: boolean
}

export type PluginConfigInputCheckbox = {
  type: 'checkbox'
  name: string
  label: string
  description?: string
  required: boolean
  checkboxLabel?: string
  defaultValue: boolean
}

export type PluginConfigInputOptions = {
  type: 'options'
  name: string
  label: string
  description?: string
  required: boolean
  defaultValue?: string
  variant: 'select' | 'radio'
  options: { value: string; label: string }[]
}

export type PluginConfigInput =
  | PluginConfigInputText
  | PluginConfigInputSeed
  | PluginConfigInputCheckbox
  | PluginConfigInputOptions

export type PluginConfigInputItem = {
  name: string
  value: string
}
