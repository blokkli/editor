<template>
  <div class="pb pb-paragraph-actions pb-control">
    <div :style="styleSize" class="pb-paragraph-actions-overlay" />
    <div
      v-if="!isDragging"
      class="pb-paragraph-actions-inner"
      :style="innerStyle"
    >
      <div v-if="paragraphType" class="pb-paragraph-actions-type">
        <button
          class="pb-paragraph-actions-type-button"
          @click.prevent="showConversions = !showConversions"
          :disabled="!possibleConversions.length || !editingEnabled"
          :class="{
            'is-interactive': possibleConversions.length,
            'is-open': showConversions,
          }"
        >
          <ParagraphIcon :bundle="paragraphType.id" />
          <span>{{ paragraphType.label }}</span>
          <IconCaret v-if="possibleConversions.length && editingEnabled" />
        </button>
        <div
          v-if="possibleConversions.length"
          class="pb-paragraph-actions-type-dropdown"
        >
          <div v-if="showConversions">
            <h3>Umwandeln zu...</h3>
            <button
              @click.prevent="$emit('convert', conversion.id)"
              v-for="conversion in possibleConversions"
            >
              <div>
                <div
                  v-if="conversion.id && icons[conversion.id]"
                  v-html="icons[conversion.id]"
                />
              </div>
              <div>
                <div>{{ conversion.label }}</div>
              </div>
            </button>
          </div>
        </div>
      </div>
      <div class="pb-paragraph-actions-buttons">
        <button
          v-if="editMode === 'translating'"
          @click="$emit('translate')"
          :disabled="!paragraphType?.isTranslatable"
        >
          <IconTranslate />
          <div class="pb-tooltip">
            <span>Übersetzen</span>
          </div>
        </button>
        <button
          v-if="editingEnabled"
          :disabled="definition?.disableEdit"
          @click="$emit('edit')"
        >
          <IconEdit />
          <div class="pb-tooltip">
            <span>Bearbeiten</span>
            <ShortcutIndicator meta key-label="E" />
          </div>
        </button>
        <button
          @click="$emit('duplicate')"
          v-if="editingEnabled"
          :disabled="isReusable"
        >
          <IconDuplicate />
          <div class="pb-tooltip">
            <span>Duplizieren</span>
            <ShortcutIndicator meta key-label="D" />
          </div>
        </button>
        <button
          v-if="libraryEnabled && editingEnabled"
          @click="showReusableDialog = true"
          :disabled="!canMakeReusable"
        >
          <IconReusable />
          <div class="pb-tooltip">
            <span>Zur Bibliothek hinzufügen</span>
          </div>
        </button>
        <button v-if="editingEnabled" @click="$emit('delete')">
          <IconDelete />
          <div class="pb-tooltip">
            <span>Löschen</span>
            <ShortcutIndicator key-label="DEL" />
          </div>
        </button>
        <div v-if="canComment" class="pb-paragraph-actions-comment">
          <button
            @click="showAddComment = !showAddComment"
            :class="{ 'pb-is-active': showAddComment }"
          >
            <IconCommentAdd />
            <div class="pb-tooltip">
              <span>Kommentieren</span>
            </div>
          </button>
        </div>
      </div>
      <div v-if="showAddComment" class="pb-paragraph-actions-comment-dropdown">
        <label for="comment_body" class="pb-form-label">Kommentar</label>
        <textarea
          v-model.lazy="comment"
          type="text"
          id="comment_body"
          class="pb-form-input"
          rows="5"
          required
        />
        <button @click="addComment" class="pb-button pb-is-primary">
          Kommentar speichern
        </button>
      </div>
      <slot></slot>
    </div>
  </div>
  <transition appear name="pb-slide-up" :duration="300">
    <ReusableDialog
      v-if="showReusableDialog"
      :uuid="selected.uuid"
      :background-class="definition?.editBackgroundClass"
      @confirm="onMakeReusable"
      @cancel="showReusableDialog = false"
    />
  </transition>
</template>

<script lang="ts" setup>
import IconDelete from './Icons/Delete.vue'
import IconDuplicate from './Icons/Duplicate.vue'
import IconReusable from './Icons/Reusable.vue'
import IconEdit from './Icons/Edit.vue'
import IconCaret from './Icons/Caret.vue'
import IconTranslate from './Icons/Translate.vue'
import IconCommentAdd from './Icons/CommentAdd.vue'
import ReusableDialog from './ReusableDialog/index.vue'
import ParagraphIcon from './ParagraphIcon/index.vue'
import ShortcutIndicator from './ShortcutIndicator/index.vue'
import { icons, definitions } from '#nuxt-paragraphs-builder/definitions'
import { AnimationFrameEvent, DraggableExistingParagraphItem } from './types'
import { falsy } from './helpers'
import { eventBus } from './eventBus'
import { PbConversion, PbEditMode, PbType } from '../../types'

const showConversions = ref(false)
const showReusableDialog = ref(false)
const showAddComment = ref(false)
const comment = ref('')

const emit = defineEmits<{
  (e: 'delete'): void
  (e: 'addComment'): void
  (e: 'edit'): void
  (e: 'translate'): void
  (e: 'duplicate'): void
  (e: 'makeReusable', label: string): void
  (e: 'convert', targetBundle: string): void
  (e: 'addComment', comment: string): void
}>()

function addComment() {
  emit('addComment', comment.value)
  showAddComment.value = false
}

function onMakeReusable(label: string) {
  showReusableDialog.value = false
  emit('makeReusable', label)
}

const props = defineProps<{
  selected: DraggableExistingParagraphItem
  paragraphType?: PbType
  allTypes: PbType[]
  conversions: PbConversion[]

  // The paragraph bundles that are allowed in the current field.
  allowedTypes: string[]
  isDragging: boolean

  canComment: boolean
  libraryEnabled: boolean
  editMode: PbEditMode
}>()

const editingEnabled = computed(() => {
  return props.editMode === 'editing'
})

watch(
  () => props.selected.uuid,
  () => {
    showConversions.value = false
  },
)

const bounds = ref({ width: 0, height: 0, left: 0, top: 0 })

const definition = computed(() => {
  return definitions.find((v) => v.bundle === props.paragraphType?.id)
})

const innerStyle = computed(() => {
  const x = Math.max(bounds.value.left, 80)
  const y = Math.min(Math.max(bounds.value.top, 120), window.innerHeight)
  return {
    transform: `translate(${x}px, ${y}px)`,
  }
})

const isReusable = computed(() => {
  return definition.value?.bundle === 'from_library'
})

const canMakeReusable = computed(() => {
  return (
    !isReusable.value &&
    props.paragraphType?.allowReusable &&
    props.allowedTypes.includes('from_library')
  )
})

const possibleConversions = computed<PbType[]>(() => {
  return props.conversions
    .filter(
      (v) =>
        v.sourceBundle === props.paragraphType?.id &&
        props.allowedTypes.includes(v.targetBundle),
    )
    .map((v) => props.allTypes.find((t) => t.id === v.targetBundle))
    .filter(falsy)
})

const styleSize = computed(() => {
  if (!bounds.value) {
    return {}
  }

  const { width, height, left, top } = bounds.value

  return {
    transform: `translate(${left}px, ${top}px)`,
    width: width + 'px',
    height: height + 'px',
  }
})

async function onKeyPress(e: KeyboardEvent) {
  if (e.key === 'd' && (e.ctrlKey || e.metaKey)) {
    e.stopImmediatePropagation()
    e.preventDefault()
    if (!isReusable.value) {
      emit('duplicate')
    }
  } else if (e.key === 'Delete') {
    e.stopImmediatePropagation()
    e.preventDefault()
    emit('delete')
  }
}

function onAnimationFrame(e: AnimationFrameEvent) {
  const rect = e.rects[props.selected.uuid]
  if (rect) {
    bounds.value.top = rect.y
    bounds.value.left = rect.x
    bounds.value.width = rect.width
    bounds.value.height = rect.height
  }
}

onMounted(() => {
  eventBus.on('animationFrame', onAnimationFrame)
  window.addEventListener('keydown', onKeyPress)
})

onUnmounted(() => {
  eventBus.off('animationFrame', onAnimationFrame)
  window.removeEventListener('keydown', onKeyPress)
})
</script>

<style lang="postcss"></style>
