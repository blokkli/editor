<template>
  <DialogModal
    :title="$t('settingsDialogTitle')"
    :width="700"
    hide-buttons
    icon="cog"
    @cancel="$emit('cancel')"
  >
    <div class="bk bk-dialog-form bk-settings">
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
      <div class="bk-form-section">
        <h3 class="bk-form-label">Erweitert</h3>
        <div class="bk-settings-buttons">
          <button class="bk-button is-danger" @click="revertAll">
            {{ $t('settingsRevertAll') }}
          </button>
        </div>
      </div>
    </div>
  </DialogModal>
</template>

<script lang="ts" setup>
import { useBlokkli } from '#imports'
import { DialogModal } from '#blokkli/components'
import FeatureSetting from './FeatureSetting/index.vue'
import type { ValidFeatureKey } from '#blokkli-runtime/features'
import type { FeatureDefinitionSetting } from '#blokkli/types'
import { SETTINGS_GROUP, type SettingsGroup } from '#blokkli/constants'
import type { BlokkliIcon } from '#blokkli/icons'

const { storage, $t, features, ui } = useBlokkli()

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
    return $t('settingsBehaviour')
  } else if (key === 'appearance') {
    return $t('settingsAppearance')
  } else if (key === 'advanced') {
    return $t('settingsAdvanced')
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

const shouldRenderSetting = (setting: FeatureDefinitionSetting): boolean => {
  if (setting.viewports?.length) {
    return setting.viewports.some((v) => ui.appViewport.value === v)
  }
  return true
}

const groups = computed<GroupedSettings[]>(() => {
  return Object.values(
    features.features.value.reduce<Record<string, GroupedSettings>>(
      (acc, feature) => {
        Object.entries(feature.settings || {}).forEach(
          ([settingsKey, setting]) => {
            if (shouldRenderSetting(setting)) {
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
      group.settings.sort((a, b) => b.settingsKey.localeCompare(a.settingsKey))
      return group
    })
    .sort((a, b) => SETTINGS_GROUP.indexOf(a.id) - SETTINGS_GROUP.indexOf(b.id))
})

defineEmits<{
  (e: 'cancel'): void
}>()

const revertAll = () => storage.clearAll()
</script>
