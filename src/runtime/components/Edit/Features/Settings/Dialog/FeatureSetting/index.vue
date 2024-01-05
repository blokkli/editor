<template>
  <div class="bk-settings-feature-setting" :class="'bk-is-' + setting.type">
    <label v-if="setting.type === 'checkbox'" class="bk-checkbox-toggle">
      <input
        :checked="settingsStorage[settingsKey] as boolean"
        type="checkbox"
        class="peer"
        @change="toggleCheckbox"
      />
      <div />
      <span>{{ setting.label }}</span>
    </label>
    <div v-else-if="setting.type === 'radios'">
      <h3 class="bk-form-label">
        {{ setting.label }}
      </h3>
      <ul class="bk-settings-ui">
        <li
          v-for="[value, config] in Object.entries(setting.options)"
          :key="value"
        >
          <label>
            <input
              :checked="settingsStorage[settingsKey] === value"
              type="radio"
              :value="true"
              :name="settingsKey"
              @change="setRadioValue(value)"
            />
            <Icon v-if="config.icon" :name="config.icon" />
            <span>{{ config.label }}</span>
          </label>
        </li>
      </ul>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { FeatureDefinitionSetting } from '#blokkli/types'
import { Icon } from '#blokkli/components'
import type { ValidFeatureKey } from '#blokkli-runtime/features'

const props = defineProps<{
  featureId: ValidFeatureKey
  settingsKey: string
  setting: FeatureDefinitionSetting
}>()

const { storage } = useBlokkli()

const settingsStorage = storage.use(
  `feature:${props.featureId}:settings`,
  {} as Record<string, boolean | string>,
)

const toggleCheckbox = () => {
  const current = settingsStorage.value[props.settingsKey]
  settingsStorage.value = {
    ...settingsStorage.value,
    [props.settingsKey]: !current,
  }
}

const setRadioValue = (value: string) => {
  settingsStorage.value = {
    ...settingsStorage.value,
    [props.settingsKey]: value,
  }
}
</script>
