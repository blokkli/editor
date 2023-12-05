<template>
  <DialogModal
    title="Einstellungen"
    :width="400"
    @cancel="$emit('cancel')"
    hide-buttons
  >
    <div class="bk bk-dialog-form">
      <div class="bk-form-section">
        <h3 class="bk-form-label">Darstellung</h3>
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
              <input type="checkbox" v-model="useArtboard" class="peer" />
              <div></div>
              <span>Zeichenfläche verwenden</span>
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
import { DialogModal } from '#blokkli/components'

const { storage } = useBlokkli()

const showImport = storage.use('showImport', true)
const useArtboard = storage.use('useArtboard', true)
const persistArtboard = storage.use('persistArtboard', true)

const emit = defineEmits<{
  (e: 'cancel'): void
}>()

const revertSort = () => storage.clear('sorts')

const revertAll = () => storage.clearAll()
</script>
