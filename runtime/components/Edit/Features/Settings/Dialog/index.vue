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
          <li v-for="checkbox in checkboxes" :key="checkbox.key">
            <label class="pb-checkbox-toggle">
              <input
                type="checkbox"
                v-model="settings[checkbox.key]"
                class="peer"
              />
              <div></div>
              <span>{{ checkbox.label }}</span>
            </label>
          </li>
        </ul>
      </div>
      <div class="pb-form-section">
        <h3 class="pb-form-label">Erweitert</h3>
        <div class="pb-settings-buttons">
          <button class="pb-button">
            Sortierung der Paragraphen zurücksetzen
          </button>

          <button class="pb-button is-danger">
            Alle Einstellungen zurücksetzen
          </button>
        </div>
      </div>
    </div>
  </DialogModal>
</template>

<script lang="ts" setup>
import { DialogModal } from '#pb/components'

const { settings } = useParagraphsBuilderStore()

const checkboxesMap = {
  showImport: '"Inhalte importieren" Dialog beim Start anzeigen',
  persistCanvas: 'Position und Zoom speichern',
}

const checkboxes = computed(() =>
  Object.entries(checkboxesMap).map(([key, label]) => ({ key, label })),
)

const emit = defineEmits<{
  (e: 'cancel'): void
}>()
</script>
