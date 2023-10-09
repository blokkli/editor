<template>
  <div class="pb pb-toolbar">
    <div class="pb-toolbar-area pb-is-menu">
      <div class="pb-toolbar-menu">
        <button
          class="pb-toolbar-menu-button"
          :class="{ 'pb-is-active': menuVisible }"
          @click="menuVisible = !menuVisible"
        >
          <IconClose v-if="menuVisible" />
          <IconMenu v-else />
        </button>
        <transition name="pb-menu" :duration="200">
          <div
            v-if="menuVisible"
            class="pb-toolbar-menu-list"
            v-click-away="onClickAway"
          >
            <button
              class="pb-toolbar-menu-list-button pb-is-success"
              @click="closeMenu(() => $emit('publish'))"
              :disabled="!mutations.length || !editingEnabled"
            >
              <div class="pb-toolbar-menu-list-icon">
                <IconPublish />
              </div>
              <strong>Veröffentlichen</strong>
              <span>Alle Änderungen öffentlich machen</span>
            </button>

            <button
              class="pb-toolbar-menu-list-button pb-is-danger"
              @click="closeMenu(() => $emit('revert'))"
              :disabled="!mutations.length || !editingEnabled"
            >
              <div class="pb-toolbar-menu-list-icon">
                <IconRevert />
              </div>
              <strong>Verwerfen...</strong>
              <span>Aktuell veröffentlichter Zustand Wiederherstellen</span>
            </button>
            <button
              class="pb-toolbar-menu-list-button"
              :disabled="editMode !== 'editing'"
              @click="closeMenu(() => $emit('showTemplates'))"
            >
              <div class="pb-toolbar-menu-list-icon">
                <IconImport />
              </div>
              <strong>Importieren...</strong>
              <span>Von einer bestehenden Seite importieren</span>
            </button>
            <button
              class="pb-toolbar-menu-list-button"
              @click="closeMenu(() => $emit('showTranslations'))"
              :disabled="editMode !== 'translating'"
            >
              <div class="pb-toolbar-menu-list-icon">
                <IconTranslate />
              </div>
              <strong>Übersetzen...</strong>
              <span>Alle Seiteninhalte übersetzen</span>
            </button>
            <button
              class="pb-toolbar-menu-list-button"
              @click="closeMenu(() => $emit('close'))"
            >
              <div class="pb-toolbar-menu-list-icon">
                <IconExit />
              </div>
              <strong>Schliessen</strong>
              <span>Editor schliessen ohne veröffentlichen</span>
            </button>
          </div>
        </transition>
      </div>
    </div>
    <transition name="pb-fade" :duration="200">
      <div v-if="menuVisible" class="pb-toolbar-menu-overlay" />
    </transition>
    <div class="pb-toolbar-container">
      <button
        class="pb-toolbar-button"
        @click="$emit('togglePreview')"
        :class="{ 'is-active': showPreview }"
      >
        <IconPreview />
        <div class="pb-tooltip">
          <span>Vorschau</span>
          <ShortcutIndicator meta key-label="P" />
        </div>
      </button>
      <a class="pb-toolbar-button" :href="previewUrl" target="_blank">
        <IconOpenInNew />
        <div class="pb-tooltip">
          <span>Vorschau (neues Fenster)</span>
          <ShortcutIndicator meta key-label="P" />
        </div>
      </a>
      <button class="pb-toolbar-button" @click="$emit('showQrCode')">
        <IconQrCode />
        <div class="pb-tooltip">
          <span>Vorschau (mit Smartphone)</span>
        </div>
      </button>
    </div>
    <div class="pb-toolbar-container">
      <button
        class="pb-toolbar-button"
        @click="$emit('undo')"
        :disabled="!canUndo || !editingEnabled"
      >
        <IconUndo />
        <div class="pb-tooltip">
          <span>Rückgängig</span>
          <ShortcutIndicator meta key-label="Z" />
        </div>
      </button>
      <button
        class="pb-toolbar-button"
        @click="$emit('redo')"
        :disabled="!canRedo || !editingEnabled"
        data-label="Wiederherstellen"
      >
        <IconRedo />
        <div class="pb-tooltip">Wiederherstellen</div>
      </button>
    </div>
    <div class="pb-toolbar-container pb-is-title">
      <button class="pb-toolbar-button" @click="$emit('openEntityForm')">
        <slot name="title"></slot>
      </button>
    </div>
    <slot name="afterTitle"></slot>
    <div class="pb-toolbar-container">
      <button class="pb-toolbar-button" @click="toggleMaskVisible">
        <IconCheckbox v-if="maskVisible" />
        <IconTextureBox v-else />
        <div class="pb-tooltip">
          <span>{{
            maskVisible ? 'Inhaltsfelder anzeigen' : 'Inhaltsfelder verstecken'
          }}</span>

          <ShortcutIndicator meta key-label="M" />
        </div>
      </button>
    </div>
    <slot name="right"></slot>

    <div class="pb-toolbar-container">
      <div class="pb-toolbar-tabs">
        <button
          @click="$emit('toggleSidebar', 'history')"
          :class="{ 'is-active': activeSidebar === 'history' }"
        >
          <IconHistory />
          <div class="pb-tooltip">Änderungen</div>
        </button>
        <button
          v-if="libraryEnabled"
          @click="$emit('toggleSidebar', 'library')"
          :class="{ 'is-active': activeSidebar === 'library' }"
          :disabled="!editingEnabled"
        >
          <IconReusable />
          <div class="pb-tooltip">Bibliothek</div>
        </button>
        <button
          @click="$emit('toggleSidebar', 'clipboard')"
          :class="{ 'is-active': activeSidebar === 'clipboard' }"
          :disabled="!editingEnabled"
        >
          <IconClipboard />
          <div class="pb-tooltip">Zwischenablage</div>
        </button>
        <button
          @click="$emit('toggleSidebar', 'errors')"
          :class="{ 'is-active': activeSidebar === 'errors' }"
        >
          <IconAlert />
          <div class="pb-tooltip">Validierungen</div>
        </button>
        <button
          v-if="commentsEnabled"
          @click="$emit('toggleSidebar', 'comments')"
          :class="{ 'is-active': activeSidebar === 'comments' }"
        >
          <IconComment />
          <div class="pb-tooltip">Kommentare</div>
        </button>
        <button
          @click="$emit('toggleSidebar', 'structure')"
          :class="{ 'is-active': activeSidebar === 'structure' }"
        >
          <IconTree />
          <div class="pb-tooltip">Struktur</div>
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { directive as vClickAway } from 'vue3-click-away'
import IconUndo from './../Icons/Undo.vue'
import IconRedo from './../Icons/Redo.vue'
import IconPublish from './../Icons/Publish.vue'
import IconReusable from './../Icons/Reusable.vue'
import IconHistory from './../Icons/History.vue'
import IconMenu from './../Icons/Menu.vue'
import IconRevert from './../Icons/Revert.vue'
import IconAlert from './../Icons/Alert.vue'
import IconClose from './../Icons/Close.vue'
import IconExit from './../Icons/Exit.vue'
import IconPreview from './../Icons/Preview.vue'
import IconClipboard from './../Icons/Clipboard.vue'
import IconComment from './../Icons/Comment.vue'
import IconTree from './../Icons/Tree.vue'
import IconCheckbox from './../Icons/Checkbox.vue'
import IconImport from './../Icons/Import.vue'
import IconTextureBox from './../Icons/TextureBox.vue'
import IconOpenInNew from './../Icons/OpenInNew.vue'
import IconTranslate from './../Icons/Translate.vue'
import IconQrCode from './../Icons/QrCode.vue'
import ShortcutIndicator from './../ShortcutIndicator/index.vue'
import { PbEditMode, PbMutation } from '../../../types'

const route = useRoute()

const { maskVisible, toggleMaskVisible } = useParagraphsBuilderStore()

const emit = defineEmits([
  'revert',
  'publish',
  'undo',
  'redo',
  'close',
  'toggleSidebar',
  'togglePreview',
  'showQrCode',
  'openEntityForm',
  'showTemplates',
  'showTranslations',
])

const props = defineProps<{
  editingEnabled: boolean
  commentsEnabled: boolean
  libraryEnabled: boolean
  currentIndex: number
  mutations: PbMutation[]
  activeSidebar: string
  violationCount: number
  showPreview: boolean
  isPressingControl: boolean
  isPressingSpace: boolean
  editMode: PbEditMode
}>()

const menuVisible = ref(false)

function closeMenu(cb?: () => void) {
  menuVisible.value = false
  if (cb) {
    cb()
  }
}

function onClickAway() {
  closeMenu()
}

const canUndo = computed(() => {
  return props.currentIndex >= 0
})

const canRedo = computed(() => {
  return props.currentIndex < props.mutations.length - 1
})

const previewUrl = computed(() => {
  return route.fullPath.replace('pbEditing', 'pbPreview')
})

async function onKeyPress(e: KeyboardEvent) {
  if (e.key === 'Z' && (e.ctrlKey || e.metaKey) && e.shiftKey) {
    e.stopImmediatePropagation()
    e.preventDefault()
    if (canRedo.value) {
      emit('redo')
    }
  } else if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
    e.stopImmediatePropagation()
    e.preventDefault()
    if (canUndo.value) {
      emit('undo')
    }
  } else if (e.key === 'm' && (e.ctrlKey || e.metaKey)) {
    e.stopImmediatePropagation()
    e.preventDefault()
    toggleMaskVisible()
  } else if (e.key === 'p' && (e.ctrlKey || e.metaKey)) {
    e.stopImmediatePropagation()
    e.preventDefault()
    emit('togglePreview')
  } else if (e.key === 'e' && (e.ctrlKey || e.metaKey)) {
    e.stopImmediatePropagation()
    e.preventDefault()
    emit('openEntityForm')
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyPress)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyPress)
})
</script>

<style lang="postcss"></style>
