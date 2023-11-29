<template>
  <DialogModal
    title="Einstellungen"
    :width="400"
    @cancel="$emit('cancel')"
    hide-buttons
  >
    <div class="pb pb-dialog-form">
      <div class="pb-form-section">
        <h3 class="pb-form-label">Darstellung</h3>
        <ul class="pb-settings-checkboxes">
          <li>
            <label class="pb-checkbox-toggle">
              <input type="checkbox" v-model="showImport" class="peer" />
              <div></div>
              <span>"Inhalte importieren" Dialog beim Start anzeigen</span>
            </label>
          </li>

          <li>
            <label class="pb-checkbox-toggle">
              <input type="checkbox" v-model="useArtboard" class="peer" />
              <div></div>
              <span>Zeichenfläche verwenden</span>
            </label>
          </li>

          <li>
            <label class="pb-checkbox-toggle">
              <input type="checkbox" v-model="persistArtboard" class="peer" />
              <div></div>
              <span>Position und Zoom speichern</span>
            </label>
          </li>
        </ul>
      </div>
      <div class="pb-form-section">
        <h3 class="pb-form-label">Erweitert</h3>
        <div class="pb-settings-buttons">
          <button class="pb-button" @click="revertSort">
            Sortierung der Paragraphen zurücksetzen
          </button>

          <button class="pb-button is-danger" @click="revertAll">
            Alle Einstellungen zurücksetzen
          </button>
        </div>
      </div>
    </div>
  </DialogModal>
</template>

<script lang="ts" setup>
import { DialogModal } from '#pb/components'

const { storage } = useParagraphsBuilderStore()

const showImport = storage.use('showImport', true)
const useArtboard = storage.use('useArtboard', true)
const persistArtboard = storage.use('persistArtboard', true)

const emit = defineEmits<{
  (e: 'cancel'): void
}>()

const revertSort = () => storage.clear('sorts')

const revertAll = () => storage.clearAll()
</script>
