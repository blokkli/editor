<template>
  <DialogModal
    :title="text('settingsDialogTitle')"
    :width="700"
    hide-buttons
    icon="cog"
    @cancel="$emit('cancel')"
  >
    <div class="bk bk-dialog-form bk-settings">
      <div class="bk-form-section">
        <h3 class="bk-form-label">
          {{ text('settingsBehaviour') }}
        </h3>
        <ul class="bk-settings-checkboxes">
          <li v-if="importFeatureEnabled">
            <label class="bk-checkbox-toggle">
              <input v-model="showImport" type="checkbox" class="peer" />
              <div />
              <span>{{ text('settingsShowImport') }}</span>
            </label>
          </li>
          <li v-if="artboardFeatureAvailable">
            <label class="bk-checkbox-toggle">
              <input v-model="persistArtboard" type="checkbox" class="peer" />
              <div />
              <span>{{ text('settingsPersistArtboard') }}</span>
            </label>
          </li>
          <li>
            <label class="bk-checkbox-toggle">
              <input v-model="useAnimations" type="checkbox" class="peer" />
              <div />
              <span>{{ text('settingsUseAnimations') }}</span>
            </label>
          </li>
        </ul>
      </div>

      <div v-if="artboardFeatureAvailable" class="bk-form-section">
        <h3 class="bk-form-label">
          {{ text('settingsViewOptions') }}
        </h3>
        <ul class="bk-settings-ui">
          <li>
            <label>
              <input v-model="useArtboard" type="radio" :value="true" />
              <Icon name="artboard-enabled" />
              <span>{{ text('settingsUseArtboardTrue') }}</span>
            </label>
          </li>
          <li>
            <label>
              <input v-model="useArtboard" type="radio" :value="false" />
              <Icon name="artboard-disabled" />
              <span>{{ text('settingsUseArtboardFalse') }}</span>
            </label>
          </li>
        </ul>
      </div>

      <div v-if="showAddListOptions" class="bk-form-section">
        <h3 class="bk-form-label">
          {{ text('settingsListOrientation') }}
        </h3>
        <ul class="bk-settings-ui">
          <li>
            <label>
              <input v-model="listOrientation" type="radio" value="vertical" />
              <Icon name="ui-list-vertical" />
              <span>{{ text('settingsListOrientationVertical') }}</span>
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
              <span>{{ text('settingsListOrientationHorizontal') }}</span>
            </label>
          </li>
          <li>
            <label>
              <input v-model="listOrientation" type="radio" value="sidebar" />
              <Icon name="ui-list-sidebar" />
              <span>{{ text('settingsListOrientationSidebar') }}</span>
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
            {{ text('settingsRevertSorting') }}
          </button>

          <button class="bk-button is-danger" @click="revertAll">
            {{ text('settingsRevertAll') }}
          </button>
        </div>
      </div>
    </div>
  </DialogModal>
</template>

<script lang="ts" setup>
import { useBlokkli } from '#imports'
import { DialogModal, Icon } from '#blokkli/components'
import { availableFeaturesAtBuild } from '#blokkli-runtime/features'

const { storage, text, ui } = useBlokkli()

const showImport = storage.use('showImport', true)
const useArtboard = storage.use('useArtboard', true)
const persistArtboard = storage.use('persistArtboard', true)
const listOrientation = storage.use<'horizontal' | 'vertical'>(
  'listOrientation',
  'vertical',
)
const useAnimations = storage.use('useAnimations', true)

const artboardFeatureAvailable = computed(
  () => availableFeaturesAtBuild.includes('Artboard') && !ui.isMobile.value,
)
const importFeatureEnabled = availableFeaturesAtBuild.includes('ImportExisting')
const showAddListOptions = computed(() => !ui.isMobile.value)

defineEmits<{
  (e: 'cancel'): void
}>()

const revertSort = () => storage.clear('sorts')

const revertAll = () => storage.clearAll()
</script>
