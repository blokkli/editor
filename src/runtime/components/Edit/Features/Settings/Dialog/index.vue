<template>
  <DialogModal
    :title="$t('settingsDialogTitle', 'Change settings')"
    :width="700"
    hide-buttons
    icon="cog"
    @cancel="$emit('cancel')"
  >
    <div class="bk bk-settings">
      <div v-for="group in groups" :key="group.key" class="bk-form-section">
        <h3 class="bk-settings-group-title">
          <span>{{ group.label }}</span>
        </h3>
        <FeatureSetting
          v-for="setting in group.settings"
          :key="group.key + setting.settingsKey"
          :feature-id="setting.featureId"
          :settings-key="setting.settingsKey"
          :setting="setting.setting"
        />
      </div>
    </div>
  </DialogModal>
</template>

<script lang="ts" setup>
import { useBlokkli, computed } from '#imports'
import { DialogModal } from '#blokkli/components'
import FeatureSetting from './FeatureSetting/index.vue'
import type { ValidFeatureKey } from '#blokkli-runtime/features'
import type { FeatureDefinitionSetting } from '#blokkli/types'
import { SETTINGS_GROUP, type SettingsGroup } from '#blokkli/constants'
import type { BlokkliIcon } from '#blokkli/icons'
import { settingsOverride } from '#blokkli/config'

const { $t, features, ui } = useBlokkli()

type FeatureSetting = {
  featureId: ValidFeatureKey
  settingsKey: string
  setting: FeatureDefinitionSetting
}

type GroupedSettings = {
  id: SettingsGroup
  key: string
  label: string
  icon: BlokkliIcon
  settings: FeatureSetting[]
}

const getGroupLabel = (key: SettingsGroup): string => {
  if (key === 'behavior') {
    return $t('settingsBehaviour', 'Behaviour')
  } else if (key === 'appearance') {
    return $t('settingsAppearance', 'Appearance')
  } else if (key === 'advanced') {
    return $t('settingsAdvanced', 'Advanced')
  }
  return key
}

const getGroupIcon = (key: SettingsGroup): BlokkliIcon => {
  if (key === 'behavior') {
    return 'tools'
  } else if (key === 'appearance') {
    return 'palette'
  } else if (key === 'advanced') {
    return 'bug'
  }
  return 'question'
}

const shouldRenderSetting = (
  key: keyof typeof settingsOverride,
  setting: FeatureDefinitionSetting,
): boolean => {
  // Setting is disabled in module config.
  if (settingsOverride[key]?.disable) {
    return false
  }
  if (setting.viewports?.length) {
    return setting.viewports.includes(ui.appViewport.value)
  }
  return true
}

const settingTypeOrder = ['checkbox', 'slider', 'method']

const groups = computed<GroupedSettings[]>(() => {
  return Object.values(
    features.features.value.reduce<Record<string, GroupedSettings>>(
      (acc, feature) => {
        Object.entries(feature.settings || {}).forEach(
          ([settingsKey, setting]) => {
            const key: any = `feature:${feature.id}:${settingsKey}`
            if (shouldRenderSetting(key, setting)) {
              const group = setting.group || 'advanced'
              if (!acc[group]) {
                acc[group] = {
                  id: group as any,
                  key: group,
                  label: getGroupLabel(group),
                  icon: getGroupIcon(group),
                  settings: [],
                }
              }

              acc[group].settings.push({
                featureId: feature.id,
                settingsKey,
                setting,
              })
            }
          },
        )
        return acc
      },
      {},
    ),
  )
    .map((group) => {
      group.settings
        .sort((a, b) => b.settingsKey.localeCompare(a.settingsKey))
        .sort(
          (a, b) =>
            settingTypeOrder.indexOf(a.setting.type) -
            settingTypeOrder.indexOf(b.setting.type),
        )
      return group
    })
    .sort((a, b) => SETTINGS_GROUP.indexOf(a.id) - SETTINGS_GROUP.indexOf(b.id))
})

defineEmits<{
  (e: 'cancel'): void
}>()
</script>
