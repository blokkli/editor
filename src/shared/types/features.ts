import type { SettingsGroup, Viewport } from './constants'

export type FeatureDefinitionSettingRadiosOptionBase<
  Icon extends string = string,
> = {
  label: string
  icon?: Icon
}

export type FeatureDefinitionSettingRadiosBase<Icon extends string = string> = {
  type: 'radios'
  label: string
  default: string
  options: Record<string, FeatureDefinitionSettingRadiosOptionBase<Icon>>
  group?: SettingsGroup
  viewports?: Viewport[]
}

export type FeatureDefinitionSettingCheckbox = {
  type: 'checkbox'
  label: string
  description?: string
  default: boolean
  group?: SettingsGroup
  viewports?: Viewport[]
}

export type FeatureDefinitionSettingSlider = {
  type: 'slider'
  label: string
  default: number
  group?: SettingsGroup
  viewports?: Viewport[]
  min: number
  max: number
  step: number
}

export type FeatureDefinitionSettingMethodBase = {
  type: 'method'
  label: string
  method: (app: any) => void
  group?: SettingsGroup
  viewports?: Viewport[]
}

export type FeatureDefinitionSettingBase<Icon extends string = string> =
  | FeatureDefinitionSettingCheckbox
  | FeatureDefinitionSettingRadiosBase<Icon>
  | FeatureDefinitionSettingMethodBase
  | FeatureDefinitionSettingSlider

export type FeatureDefinitionBase<
  AdapterMethodsType extends string = string,
  Icon extends string = string,
  FeatureId extends string = string,
> = {
  /**
   * The unique ID of the feature.
   */
  id: string

  /**
   * The label of the feature.
   */
  label?: string

  /**
   * The icon of the feature.
   */
  icon: Icon

  /**
   * Description of the feature.
   */
  description?: string

  /**
   * Dependencies of the feature.
   *
   * Loads this feature only after all of the given features have loaded.
   *
   * If one of the dependencies does not load, this feature won't load too.
   */
  dependencies?: FeatureId[]

  /**
   * The viewports for which this feature will be loaded.
   */
  viewports?: Viewport[]

  /**
   * The adapter methods required for this feature to work.
   *
   * If the adapter does not implement all methods, the feature won't load.
   */
  requiredAdapterMethods?: AdapterMethodsType[]

  /**
   * Feature-specific settings that will be rendered in the settings dialog.
   */
  settings?: Record<string, FeatureDefinitionSettingBase<Icon>>

  /**
   * Name of the screenshot image file, relative to the feature directory.
   */
  screenshot?: string

  /**
   * If true, the feature has to be explicitly enabled before it is loaded.
   */
  beta?: boolean
}
