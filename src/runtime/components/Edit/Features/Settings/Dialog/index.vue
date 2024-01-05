<template>
  <DialogModal
    :title="$t('settingsDialogTitle')"
    :width="700"
    hide-buttons
    icon="cog"
    @cancel="$emit('cancel')"
  >
    <div class="bk bk-dialog-form bk-settings">
      <FeatureSettings
        v-for="setting in featureSettings"
        :id="setting.id"
        :key="setting.id"
        :label="setting.label"
        :icon="setting.icon"
      />
      <div class="bk-form-section">
        <h3 class="bk-form-label">
          {{ $t('settingsBehaviour') }}
        </h3>
        <ul class="bk-settings-checkboxes">
          <li>
            <label class="bk-checkbox-toggle">
              <input v-model="useAnimations" type="checkbox" class="peer" />
              <div />
              <span>{{ $t('settingsUseAnimations') }}</span>
            </label>
          </li>
        </ul>
      </div>

      <div v-if="showAddListOptions" class="bk-form-section">
        <h3 class="bk-form-label">
          {{ $t('settingsListOrientation') }}
        </h3>
        <ul class="bk-settings-ui">
          <li>
            <label>
              <input v-model="listOrientation" type="radio" value="vertical" />
              <Icon name="ui-list-vertical" />
              <span>{{ $t('settingsListOrientationVertical') }}</span>
            </label>
          </li>
          <li>
            <label>
              <input
                v-model="listOrientation"
                type="radio"
                value="horizontal"
              />
              <Icon name="ui-list-horizontal" />
              <span>{{ $t('settingsListOrientationHorizontal') }}</span>
            </label>
          </li>
          <li>
            <label>
              <input v-model="listOrientation" type="radio" value="sidebar" />
              <Icon name="ui-list-sidebar" />
              <span>{{ $t('settingsListOrientationSidebar') }}</span>
            </label>
          </li>
        </ul>
      </div>

      <div class="bk-form-section">
        <h3 class="bk-form-label">Erweitert</h3>
        <div class="bk-settings-buttons">
          <button
            v-if="showAddListOptions"
            class="bk-button"
            @click="revertSort"
          >
            {{ $t('settingsRevertSorting') }}
          </button>

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
import { DialogModal, Icon } from '#blokkli/components'
import FeatureSettings from './FeatureSettings/index.vue'
import type { BlokkliIcon } from '#blokkli/icons'

const { storage, $t, ui, features } = useBlokkli()

type FeatureSetting = {
  id: string
  label: string
  icon: BlokkliIcon
}

const featureSettings = computed(() => {
  return Object.values(
    features.features.value.reduce<Record<string, FeatureSetting>>((acc, v) => {
      if (v.settings) {
        acc[v.id] = {
          id: v.id,
          label: v.label || v.id,
          icon: v.icon,
        }
      }
      return acc
    }, {}),
  )
})

const listOrientation = storage.use<'horizontal' | 'vertical'>(
  'listOrientation',
  'vertical',
)
const useAnimations = storage.use('useAnimations', true)

const showAddListOptions = computed(() => !ui.isMobile.value)

defineEmits<{
  (e: 'cancel'): void
}>()

const revertSort = () => storage.clear('sorts')

const revertAll = () => storage.clearAll()
</script>
