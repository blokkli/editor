import type { BlokkliIcon } from '#blokkli-build/icons'
import type {
  FeatureDefinitionBase,
  FeatureDefinitionSettingCheckbox,
  FeatureDefinitionSettingMethod,
  FeatureDefinitionSettingRadios,
  FeatureDefinitionSettingSlider,
} from './../../../shared/types/features'
import type { AdapterMethods } from '#blokkli/editor/adapter'
import type { BlokkliApp } from './app'

export type FeatureDefinitionSetting =
  | FeatureDefinitionSettingCheckbox
  | FeatureDefinitionSettingRadios<BlokkliIcon>
  | FeatureDefinitionSettingMethod<BlokkliApp>
  | FeatureDefinitionSettingSlider

export type FeatureDefinition<
  Methods extends AdapterMethods[] = [],
  T extends string = '',
> = Omit<
  FeatureDefinitionBase<AdapterMethods, BlokkliIcon, T>,
  'requiredAdapterMethods' | 'settings'
> & {
  requiredAdapterMethods?: [...Methods]
  settings?: Record<string, FeatureDefinitionSetting>
}
