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
      <span>{{ settingLabel }}</span>
    </label>
    <div v-else-if="setting.type === 'radios'">
      <h3 class="bk-form-label">
        {{ settingLabel }}
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
            <span>{{ getOptionLabel(value, config.label) }}</span>
          </label>
        </li>
      </ul>
    </div>
    <div v-else-if="setting.type === 'method'">
      <button class="bk-button" @click="setting.method()">
        {{ settingLabel }}
      </button>
    </div>
    <div v-else-if="setting.type === 'slider'">
      <label class="bk-input-range">
        <span>{{ settingLabel }}: {{ settingsStorage[settingsKey] }}</span>
        <input
          :value="settingsStorage[settingsKey]"
          type="range"
          :min="setting.min"
          :max="setting.max"
          :step="setting.step"
          list="tickmarks"
          @input="setSliderValue($event)"
        />
        <datalist id="tickmarks">
          <option v-for="tick in tickmarks" :key="tick" :value="tick"></option>
        </datalist>
      </label>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { FeatureDefinitionSetting } from '#blokkli/types'
import { Icon } from '#blokkli/components'
import type { ValidFeatureKey } from '#blokkli-runtime/features'
import { useBlokkli, computed } from '#imports'

const props = defineProps<{
  featureId: ValidFeatureKey
  settingsKey: string
  setting: FeatureDefinitionSetting
}>()

const { storage, $t: textTranslation } = useBlokkli()

const settingLabel = computed(() => {
  return (
    textTranslation(
      'feature_' + props.featureId + '_setting_' + props.settingsKey + '_label',
    ) || props.setting.label
  )
})

const getOptionLabel = (key: string, defaultLabel: string) => {
  return (
    textTranslation(
      'feature_' +
        props.featureId +
        '_setting_' +
        props.settingsKey +
        '_option_' +
        key,
    ) || defaultLabel
  )
}

const settingsStorage = storage.use(
  `feature:${props.featureId}:settings`,
  {} as Record<string, boolean | string | number>,
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

const setSliderValue = (e: Event) => {
  if (e.target instanceof HTMLInputElement) {
    settingsStorage.value = {
      ...settingsStorage.value,
      [props.settingsKey]: parseFloat(e.target.value),
    }
  }
}

const tickmarks = computed(() => {
  if (props.setting.type === 'slider') {
    const values: number[] = []
    for (
      let value = props.setting.min;
      value <= props.setting.max;
      value += props.setting.step
    ) {
      values.push(value)
    }
    values.push(props.setting.max)
    return values
  }

  return []
})
</script>
