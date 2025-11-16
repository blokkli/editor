import type { BlokkliIcon } from '#blokkli-build/icons'

type DefinitionOptionText = {
  /**
   * The option type.
   */
  type: 'text'

  /**
   * The default value.
   */
  default: string

  /**
   * The label displayed in the editor.
   */
  label: string

  /**
   * Optional description providing additional context.
   *
   * Displayed below the option label in the editor.
   */
  description?: string

  /**
   * The HTML input type.
   *
   * @default 'text'
   */
  inputType?: 'text' | 'number' | 'date'

  /**
   * Optional group name for organizing options.
   *
   * Options with the same group are displayed together in a dropdown.
   */
  group?: string
}

type DefinitionOptionNumber = {
  /**
   * The option type.
   */
  type: 'number'

  /**
   * The default value.
   */
  default: number

  /**
   * The label displayed in the editor.
   */
  label: string

  /**
   * Optional description providing additional context.
   *
   * Displayed below the option label in the editor.
   */
  description?: string

  /**
   * Minimum allowed value.
   */
  min: number

  /**
   * Maximum allowed value.
   */
  max: number

  /**
   * Optional group name for organizing options.
   *
   * Options with the same group are displayed together in a dropdown.
   */
  group?: string
}

type DefinitionOptionRange = {
  /**
   * The option type.
   */
  type: 'range'

  /**
   * The default value.
   */
  default: number

  /**
   * The label displayed in the editor.
   */
  label: string

  /**
   * Optional description providing additional context.
   *
   * Displayed below the option label in the editor.
   */
  description?: string

  /**
   * Minimum allowed value.
   */
  min: number

  /**
   * Maximum allowed value.
   */
  max: number

  /**
   * The step increment.
   */
  step: number

  /**
   * Optional group name for organizing options.
   *
   * Options with the same group are displayed together in a dropdown.
   */
  group?: string
}

type DefinitionOptionDateTimeLocal = {
  /**
   * The option type.
   */
  type: 'datetime-local'

  /**
   * The label displayed in the editor.
   */
  label: string

  /**
   * Optional description providing additional context.
   *
   * Displayed below the option label in the editor.
   */
  description?: string

  /**
   * The default value as an ISO 8601 datetime string.
   *
   * @example '2024-03-15T14:30:00'
   */
  default?: string

  /**
   * Minimum allowed datetime as an ISO 8601 string.
   */
  min?: string

  /**
   * Maximum allowed datetime as an ISO 8601 string.
   */
  max?: string

  /**
   * Optional group name for organizing options.
   *
   * Options with the same group are displayed together in a dropdown.
   */
  group?: string
}

type DefinitionOptionCheckbox = {
  /**
   * The option type.
   */
  type: 'checkbox'

  /**
   * The default value.
   */
  default: boolean

  /**
   * The label displayed in the editor.
   */
  label: string

  /**
   * Optional description providing additional context.
   *
   * Displayed below the option label in the editor.
   */
  description?: string

  /**
   * Optional group name for organizing options.
   *
   * Options with the same group are displayed together in a dropdown.
   */
  group?: string
}

type DefinitionOptionColor = {
  /**
   * The option type.
   */
  type: 'color'

  /**
   * The default value as a HEX color string.
   *
   * @example '#ff0000'
   */
  default: `#${string}`

  /**
   * The label displayed in the editor.
   */
  label: string

  /**
   * Optional description providing additional context.
   *
   * Displayed below the option label in the editor.
   */
  description?: string

  /**
   * Optional group name for organizing options.
   *
   * Options with the same group are displayed together in a dropdown.
   */
  group?: string
}

type DefinitionOptionCheckboxes = {
  /**
   * The option type.
   */
  type: 'checkboxes'

  /**
   * The label displayed in the editor.
   */
  label: string

  /**
   * Optional description providing additional context.
   *
   * Displayed below the option label in the editor.
   */
  description?: string

  /**
   * The default values.
   */
  default: string[]

  /**
   * Available options.
   *
   * Key is the option value, value is the display label.
   */
  options: Record<string, string>

  /**
   * Optional group name for organizing options.
   *
   * Options with the same group are displayed together in a dropdown.
   */
  group?: string
}

type DefinitionOptionRadiosGridOption = {
  /**
   * Column widths as flex-grow values.
   *
   * @example [1, 2] for a 1:2 ratio
   */
  columns: number[]

  /**
   * The label displayed for this option.
   */
  label: string
}

type DefinitionOptionRadiosGrid = {
  /**
   * Display options as grid layouts.
   */
  displayAs: 'grid'

  /**
   * Available options.
   *
   * Key is the option value, value is the grid configuration.
   */
  options: Record<string, DefinitionOptionRadiosGridOption>
}

type DefinitionOptionRadiosColorsOption = {
  /**
   * Optional HEX color value.
   *
   * @example '#ff0000'
   */
  hex?: `#${string}`

  /**
   * Optional CSS class for the color.
   *
   * Used as fallback when hex is not provided.
   */
  class?: string

  /**
   * The label displayed for this option.
   */
  label: string
}

type DefinitionOptionRadiosColors = {
  /**
   * Display options as color swatches.
   */
  displayAs: 'colors'

  /**
   * Available color options.
   *
   * Key is the option value, value is the color configuration.
   */
  options: Record<string, DefinitionOptionRadiosColorsOption>
}

type DefinitionOptionRadiosRadios = {
  /**
   * Display options as radio buttons.
   *
   * @default 'radios'
   */
  displayAs?: 'radios' | undefined

  /**
   * Available options.
   *
   * Key is the option value, value is the display label.
   */
  options: Record<string, string>
}

type DefinitionOptionRadiosIconsOption = {
  /**
   * The icon to display.
   *
   * Icon files must be in the same folder as the component and start with 'icon-blokkli-'.
   */
  icon: BlokkliIcon

  /**
   * The label displayed for this option.
   */
  label: string
}

type DefinitionOptionRadiosIcons = {
  /**
   * Display options as icons.
   */
  displayAs: 'icons'

  /**
   * Available icon options.
   *
   * Key is the option value, value is the icon configuration.
   */
  options: Record<string, DefinitionOptionRadiosIconsOption>
}

type DefinitionOptionRadios = {
  /**
   * The option type.
   */
  type: 'radios'

  /**
   * The label displayed in the editor.
   */
  label: string

  /**
   * Optional description providing additional context.
   *
   * Displayed below the option label in the editor.
   */
  description?: string

  /**
   * The default value.
   *
   * Must be one of the option keys.
   */
  default: string

  /**
   * Optional group name for organizing options.
   *
   * Options with the same group are displayed together in a dropdown.
   */
  group?: string
} & (
  | DefinitionOptionRadiosColors
  | DefinitionOptionRadiosGrid
  | DefinitionOptionRadiosRadios
  | DefinitionOptionRadiosIcons
)

export type BlockOptionDefinition =
  | DefinitionOptionColor
  | DefinitionOptionCheckbox
  | DefinitionOptionCheckboxes
  | DefinitionOptionRadios
  | DefinitionOptionText
  | DefinitionOptionRange
  | DefinitionOptionNumber
  | DefinitionOptionDateTimeLocal
