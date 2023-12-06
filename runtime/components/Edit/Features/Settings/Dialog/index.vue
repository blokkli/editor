<template>
  <DialogModal
    :title="text('settingsDialogTitle')"
    :width="400"
    @cancel="$emit('cancel')"
    hide-buttons
  >
    <div class="bk bk-dialog-form bk-settings">
      <div class="bk-form-section">
        <h3 class="bk-form-label">{{ text('settingsBehaviour') }}</h3>
        <ul class="bk-settings-checkboxes">
          <li>
            <label class="bk-checkbox-toggle">
              <input type="checkbox" v-model="showImport" class="peer" />
              <div></div>
              <span>{{ text('settingsShowImport') }}</span>
            </label>
          </li>
          <li>
            <label class="bk-checkbox-toggle">
              <input type="checkbox" v-model="persistArtboard" class="peer" />
              <div></div>
              <span>{{ text('settingsPersistArtboard') }}</span>
            </label>
          </li>
        </ul>
      </div>

      <div class="bk-form-section">
        <h3 class="bk-form-label">{{ text('settingsViewOptions') }}</h3>
        <ul class="bk-settings-ui">
          <li>
            <label>
              <input type="radio" v-model="useArtboard" :value="true" />
              <Icon name="artboard-enabled" />
              <span>{{ text('settingsUseArtboardTrue') }}</span>
            </label>
          </li>
          <li>
            <label>
              <input type="radio" v-model="useArtboard" :value="false" />
              <Icon name="artboard-disabled" />
              <span>{{ text('settingsUseArtboardFalse') }}</span>
            </label>
          </li>
        </ul>
      </div>

      <div class="bk-form-section">
        <h3 class="bk-form-label">{{ text('settingsListOrientation') }}</h3>
        <ul class="bk-settings-ui">
          <li>
            <label>
              <input type="radio" v-model="listOrientation" value="vertical" />
              <Icon name="ui-list-vertical" />
              <span>{{ text('settingsListOrientationVertical') }}</span>
            </label>
          </li>
          <li>
            <label>
              <input
                type="radio"
                v-model="listOrientation"
                value="horizontal"
              />
              <Icon name="ui-list-horizontal" />
              <span>{{ text('settingsListOrientationHorizontal') }}</span>
            </label>
          </li>
        </ul>
      </div>

      <div class="bk-form-section">
        <h3 class="bk-form-label">Erweitert</h3>
        <div class="bk-settings-buttons">
          <button class="bk-button" @click="revertSort">
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
import { DialogModal, Icon } from '#blokkli/components'

const { storage, text } = useBlokkli()

const showImport = storage.use('showImport', true)
const useArtboard = storage.use('useArtboard', true)
const persistArtboard = storage.use('persistArtboard', true)
const listOrientation = storage.use<'horizontal' | 'vertical'>(
  'listOrientation',
  'vertical',
)

const emit = defineEmits<{
  (e: 'cancel'): void
}>()

const revertSort = () => storage.clear('sorts')

const revertAll = () => storage.clearAll()
</script>
