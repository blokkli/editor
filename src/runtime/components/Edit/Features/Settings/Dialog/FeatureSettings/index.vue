<template>
  <div class="bk-form-section">
    <h3 class="bk-form-label">
      <Icon :name="icon" />
      <span>{{ label }}</span>
    </h3>
    <div v-for="setting in featureSettings" :key="setting.key">
      <label
        v-if="setting.config.type === 'checkbox'"
        class="bk-checkbox-toggle"
      >
        <input
          :checked="settingsStorage[setting.key] as boolean"
          type="checkbox"
          class="peer"
          @change="toggleCheckbox(setting.key)"
        />
        <div />
        <span>{{ setting.config.label }}</span>
      </label>
      <div v-else-if="setting.config.type === 'radios'">
        <ul class="bk-settings-ui">
          <li
            v-for="[value, config] in Object.entries(setting.config.options)"
            :key="value"
          >
            <label>
              <input
                :checked="settingsStorage[setting.key] === value"
                type="radio"
                :value="true"
                :name="setting.key"
                @change="setRadioValue(setting.key, value)"
              />
              <Icon :name="config.icon" />
              <span>{{ config.label }}</span>
            </label>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { FeatureDefinition } from '#blokkli/types'
import { Icon } from '#blokkli/components'
import type { BlokkliIcon } from '#blokkli/icons'

const props = defineProps<{
  id: string
  label: string
  icon: BlokkliIcon
}>()

const { features, storage } = useBlokkli()

const settingsStorage = storage.use(
  `feature:${props.id}:settings`,
  {} as Record<string, boolean | string>,
)

const feature = computed<FeatureDefinition<any>>(
  () => features.features.value.find((v) => v.id === props.id)!,
)

const featureSettings = computed(() => {
  return Object.entries(feature.value.settings || {}).map(([key, config]) => {
    return { key, config }
  })
})

const toggleCheckbox = (key: string) => {
  const current = settingsStorage.value[key]
  settingsStorage.value = {
    ...settingsStorage.value,
    [key]: !current,
  }
}

const setRadioValue = (key: string, value: string) => {
  settingsStorage.value = {
    ...settingsStorage.value,
    [key]: value,
  }
}
</script>
