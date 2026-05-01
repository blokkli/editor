<template>
  <div class="bk-form-item" :class="'bk-is-' + setting.type">
    <FormToggle
      v-if="setting.type === 'checkbox'"
      :label="settingLabel"
      :description="settingDescription"
      :model-value="
        (settingsStorage[settingsKey] ?? setting.default) as boolean
      "
      @update:model-value="toggleCheckbox"
    />
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
      <button
        class="bk-button bk-scheme-mono bk-is-light"
        @click="setting.method(blokkliApp)"
      >
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
          <option v-for="tick in tickmarks" :key="tick" :value="tick" />
        </datalist>
      </label>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { Icon, FormToggle } from '#blokkli/editor/components'
import type { ValidFeatureKey } from '#blokkli-build/features'
import { useBlokkli, computed } from '#imports'
import type { FeatureDefinitionSetting } from '#blokkli/editor/types/features'

const props = defineProps<{
  featureId: ValidFeatureKey
  settingsKey: string
  setting: FeatureDefinitionSetting
}>()

const { storage, $t: textTranslation } = useBlokkli()
const blokkliApp = useBlokkli()

const settingLabel = computed(() => {
  return (
    textTranslation(
      'feature_' + props.featureId + '_setting_' + props.settingsKey + '_label',
    ) || props.setting.label
  )
})

const settingDescription = computed(() => {
  const translated = textTranslation(
    'feature_' +
      props.featureId +
      '_setting_' +
      props.settingsKey +
      '_description',
  )

  if (!translated && 'description' in props.setting) {
    return props.setting.description
  }

  return translated
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
  true,
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
      [props.settingsKey]: Number.parseFloat(e.target.value),
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

<style lang="postcss">
.bk .bk-input-range {
  @apply block w-full;
  input {
    @apply w-full block accent-accent-700 bg-mono-100 rounded-full border border-mono-300;
  }

  span {
    @apply font-medium mb-5 inline-block;
  }
}
</style>
