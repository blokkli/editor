export type DefinitionString = string | Record<string, string>

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
  label: DefinitionString

  /**
   * Optional description providing additional context.
   *
   * Displayed below the option label in the editor.
   */
  description?: DefinitionString

  /**
   * The placeholder.
   */
  placeholder?: DefinitionString

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

type DefinitionOptionNumberBase = {
  /**
   * The option type.
   */
  type: 'number'

  /**
   * The label displayed in the editor.
   */
  label: DefinitionString

  /**
   * Optional description providing additional context.
   *
   * Displayed below the option label in the editor.
   */
  description?: DefinitionString

  /**
   * Minimum allowed value.
   *
   * Optional — when omitted, no lower bound is enforced.
   */
  min?: number

  /**
   * Maximum allowed value.
   *
   * Optional — when omitted, no upper bound is enforced.
   */
  max?: number

  /**
   * Optional group name for organizing options.
   *
   * Options with the same group are displayed together in a dropdown.
   */
  group?: string
}

type DefinitionOptionNumber = DefinitionOptionNumberBase &
  (
    | {
        /**
         * When true, the value can be unset (`undefined`). The editor renders
         * an empty input as "Auto".
         */
        nullable: true

        /**
         * The default value. May be omitted when `nullable: true`.
         */
        default?: number
      }
    | {
        nullable?: false

        /**
         * The default value.
         */
        default: number
      }
  )

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
  label: DefinitionString

  /**
   * Optional description providing additional context.
   *
   * Displayed below the option label in the editor.
   */
  description?: DefinitionString

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
  label: DefinitionString

  /**
   * Optional description providing additional context.
   *
   * Displayed below the option label in the editor.
   */
  description?: DefinitionString

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
  label: DefinitionString

  /**
   * Optional description providing additional context.
   *
   * Displayed below the option label in the editor.
   */
  description?: DefinitionString

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
  label: DefinitionString

  /**
   * Optional description providing additional context.
   *
   * Displayed below the option label in the editor.
   */
  description?: DefinitionString

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
  label: DefinitionString

  /**
   * Optional description providing additional context.
   *
   * Displayed below the option label in the editor.
   */
  description?: DefinitionString

  /**
   * The default values.
   */
  default: string[]

  /**
   * Available options.
   *
   * Key is the option value, value is the display label.
   */
  options: Record<string, DefinitionString>

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
  label: DefinitionString

  /**
   * Optional description providing additional context for this option.
   */
  description?: DefinitionString
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
  label: DefinitionString

  /**
   * Optional description providing additional context for this option.
   */
  description?: DefinitionString
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
   * Key is the option value, value is the display label or an object with
   * label and optional description.
   */
  options: Record<
    string,
    string | { label: DefinitionString; description?: DefinitionString }
  >
}

type DefinitionOptionRadiosIconsOptionBase<Icon extends string = string> = {
  /**
   * The icon to display.
   *
   * Icon files must be in the same folder as the component and start with 'icon-blokkli-'.
   */
  icon: Icon

  /**
   * The label displayed for this option.
   */
  label: DefinitionString

  /**
   * Optional description providing additional context for this option.
   */
  description?: DefinitionString
}

type DefinitionOptionRadiosIconsBase<Icon extends string = string> = {
  /**
   * Display options as icons.
   */
  displayAs: 'icons'

  /**
   * Available icon options.
   *
   * Key is the option value, value is the icon configuration.
   */
  options: Record<string, DefinitionOptionRadiosIconsOptionBase<Icon>>
}

type DefinitionOptionRadiosBase<Icon extends string = string> = {
  /**
   * The option type.
   */
  type: 'radios'

  /**
   * The label displayed in the editor.
   */
  label: DefinitionString

  /**
   * Optional description providing additional context.
   *
   * Displayed below the option label in the editor.
   */
  description?: DefinitionString

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
  | DefinitionOptionRadiosIconsBase<Icon>
)

type DefinitionOptionJsonBase<DataType extends string = string> = {
  type: 'json'
  label: DefinitionString
  default: string
  dataType?: DataType
  description?: DefinitionString
  group?: string
}

export type BlockOptionDefinitionBase<
  Icon extends string = string,
  DataType extends string = string,
> =
  | DefinitionOptionJsonBase<DataType>
  | DefinitionOptionColor
  | DefinitionOptionCheckbox
  | DefinitionOptionCheckboxes
  | DefinitionOptionRadiosBase<Icon>
  | DefinitionOptionText
  | DefinitionOptionRange
  | DefinitionOptionNumber
  | DefinitionOptionDateTimeLocal

/**
 * Runtime block option array with validation data.
 * The third element varies by option type:
 * - radios/checkboxes: string[] of allowed keys (empty array = accept all)
 * - number: optional [min?, max?] tuple. A 4th element `true` marks the option
 *   as nullable (value may be `undefined`).
 * - range: [min, max] tuple (always required).
 * - datetime-local: optional [min?, max?] tuple
 * - other types: no third element
 */
export type RuntimeBlockOptionArray =
  | ['text', string]
  | ['json', string]
  | ['json', string, string]
  | ['checkbox', boolean]
  | ['color', `#${string}`]
  | ['radios', string, string[]]
  | ['checkboxes', string[], string[]]
  | ['number', number | undefined]
  | ['number', number | undefined, [number | undefined, number | undefined]]
  | [
      'number',
      number | undefined,
      [number | undefined, number | undefined],
      true,
    ]
  | ['range', number, [number, number]]
  | ['datetime-local', string | undefined]
  | [
      'datetime-local',
      string | undefined,
      [string | undefined, string | undefined],
    ]
