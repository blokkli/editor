<template>
  <DialogModal
    title="Einstellungen"
    :width="400"
    @cancel="$emit('cancel')"
    hide-buttons
  >
    <div class="bk bk-dialog-form bk-settings">
      <div class="bk-form-section">
        <h3 class="bk-form-label">Verhalten</h3>
        <ul class="bk-settings-checkboxes">
          <li>
            <label class="bk-checkbox-toggle">
              <input type="checkbox" v-model="showImport" class="peer" />
              <div></div>
              <span>"Inhalte importieren" Dialog beim Start anzeigen</span>
            </label>
          </li>
          <li>
            <label class="bk-checkbox-toggle">
              <input type="checkbox" v-model="persistArtboard" class="peer" />
              <div></div>
              <span>Position und Zoom speichern</span>
            </label>
          </li>
        </ul>
      </div>
      <div class="bk-form-section">
        <h3 class="bk-form-label">Darstellung</h3>
        <ul class="bk-settings-checkboxes">
          <li>
            <label class="bk-checkbox-toggle">
              <input type="checkbox" v-model="useArtboard" class="peer" />
              <div></div>
              <span>Zeichenfläche verwenden</span>
            </label>
          </li>
        </ul>
      </div>

      <div class="bk-form-section">
        <h3 class="bk-form-label">Inhaltsdarstellung</h3>
        <ul class="bk-settings-ui">
          <li>
            <label>
              <input type="radio" v-model="useArtboard" :value="true" />
              <Icon name="artboard-enabled" />
              <span>Zeichenfläche verwenden</span>
            </label>
          </li>
          <li>
            <label>
              <input type="radio" v-model="useArtboard" :value="false" />
              <Icon name="artboard-disabled" />
              <span>Normale Darstellung</span>
            </label>
          </li>
        </ul>
      </div>

      <div class="bk-form-section">
        <h3 class="bk-form-label">Inhaltselemente</h3>
        <ul class="bk-settings-ui">
          <li>
            <label>
              <input type="radio" v-model="listOrientation" value="vertical" />
              <Icon name="ui-list-vertical" />
              <span>Vertikal</span>
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
              <span>Horizontal</span>
            </label>
          </li>
        </ul>
      </div>

      <div class="bk-form-section">
        <h3 class="bk-form-label">Erweitert</h3>
        <div class="bk-settings-buttons">
          <button class="bk-button" @click="revertSort">
            Sortierung der Paragraphen zurücksetzen
          </button>

          <button class="bk-button is-danger" @click="revertAll">
            Alle Einstellungen zurücksetzen
          </button>
        </div>
      </div>
    </div>
  </DialogModal>
</template>

<script lang="ts" setup>
import { DialogModal, Icon } from '#blokkli/components'

const { storage } = useBlokkli()

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
