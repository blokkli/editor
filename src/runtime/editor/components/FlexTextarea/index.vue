<template>
  <div
    class="bk-flex-textarea"
    :class="{ 'bk-is-scrollable': isScrollable }"
    :style="{
      height: height + 'px',
    }"
  >
    <textarea
      ref="textarea"
      v-bind="$attrs"
      v-model="modelValue"
      :class="{
        'bk-form-input': textareaClass,
      }"
      @keydown.capture.stop="onKeydown"
      @keyup.capture.stop
      @pointerdown="onPointerDown"
      @paste="onPaste"
    />
  </div>
</template>

<script lang="ts" setup>
import { useTemplateRef, ref, computed, watch, onMounted, useBlokkli } from '#imports'
import { onBlokkliEvent } from '#blokkli/editor/composables'
import { ClipboardData } from '#blokkli/editor/helpers/clipboardData'
import { textAutoReplace } from '#blokkli-build/editor-config'

const GUILLEMET_LANGUAGES = ['de', 'fr']

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    maxHeight?: number
    minHeight?: number
    submitOnEnter?: boolean
    /** When true, convert pasted HTML to markdown */
    pasteMarkdown?: boolean
    /** Called before the built-in paste handling. Return true to skip it. */
    onBeforePaste?: (data: ClipboardData) => boolean
    textareaClass?: boolean
    autofocus?: boolean
  }>(),
  {
    minHeight: 70,
    maxHeight: undefined,
    onBeforePaste: undefined,
  },
)

const emit = defineEmits<{
  (e: 'submit'): void
  (e: 'keydown', event: KeyboardEvent): void
}>()

const { ui } = useBlokkli()

const shouldReplaceQuotes = computed(
  () =>
    textAutoReplace.quotes &&
    GUILLEMET_LANGUAGES.includes(ui.interfaceLanguage.value),
)

const modelValue = defineModel<string>({ required: true })

const textarea = useTemplateRef('textarea')

const height = ref(props.minHeight)

const isScrollable = computed(() => {
  if (!props.maxHeight) return false
  return height.value >= props.maxHeight
})

// ---------------------------------------------------------------------------
// Undo/redo history stack.
//
// Since v-model breaks the browser's native undo stack, we implement our own.
// Snapshots are taken on typing pauses (~400ms), action type changes
// (insert vs delete), and explicit pushes (e.g. programmatic replacements).
// ---------------------------------------------------------------------------

type HistoryEntry = { text: string; cursor: number }

const IDLE_MS = 400

let history: HistoryEntry[] = []
let historyIndex = -1
let lastActionType: 'insert' | 'delete' | 'other' | null = null
let idleTimer: ReturnType<typeof setTimeout> | null = null
// Prevents the watcher from pushing a snapshot when we're restoring one.
let restoringSnapshot = false

function currentSnapshot(): HistoryEntry {
  const el = textarea.value
  return {
    text: modelValue.value,
    cursor: el?.selectionStart ?? modelValue.value.length,
  }
}

function pushSnapshot(entry?: HistoryEntry) {
  const snap = entry ?? currentSnapshot()
  // Don't push duplicates.
  if (history[historyIndex]?.text === snap.text) {
    return
  }
  // Discard any redo entries beyond the current position.
  history = history.slice(0, historyIndex + 1)
  history.push(snap)
  historyIndex = history.length - 1
}

/**
 * Push an explicit snapshot. Call this before making a programmatic
 * replacement (like guillemet auto-replace) so the user can undo it.
 */
function pushUndoSnapshot() {
  clearIdleTimer()
  pushSnapshot()
}

function clearIdleTimer() {
  if (idleTimer !== null) {
    clearTimeout(idleTimer)
    idleTimer = null
  }
}

function scheduleIdleSnapshot() {
  clearIdleTimer()
  idleTimer = setTimeout(() => {
    pushSnapshot()
  }, IDLE_MS)
}

function undo() {
  if (historyIndex < 0) {
    return
  }
  // If we're at the tip, save current state so redo can return to it.
  if (historyIndex === history.length - 1) {
    const snap = currentSnapshot()
    if (history[historyIndex]?.text !== snap.text) {
      pushSnapshot(snap)
    }
  }
  if (historyIndex <= 0) {
    return
  }
  historyIndex--
  restoreSnapshot(history[historyIndex]!)
}

function redo() {
  if (historyIndex >= history.length - 1) {
    return
  }
  historyIndex++
  restoreSnapshot(history[historyIndex]!)
}

function restoreSnapshot(entry: HistoryEntry) {
  restoringSnapshot = true
  modelValue.value = entry.text
  requestAnimationFrame(() => {
    textarea.value?.setSelectionRange(entry.cursor, entry.cursor)
    restoringSnapshot = false
  })
}

function onInput() {
  if (restoringSnapshot) {
    return
  }

  const el = textarea.value
  if (!el) {
    return
  }

  // Determine action type from the input event.
  const text = el.value
  const prevText = history[historyIndex]?.text ?? ''
  const actionType: 'insert' | 'delete' | 'other' =
    text.length > prevText.length
      ? 'insert'
      : text.length < prevText.length
        ? 'delete'
        : 'other'

  // If the action type changed (e.g. started deleting after typing),
  // save a snapshot before continuing.
  if (lastActionType !== null && actionType !== lastActionType) {
    pushSnapshot({
      text: prevText,
      cursor: history[historyIndex]?.cursor ?? el.selectionStart,
    })
  }
  lastActionType = actionType

  scheduleIdleSnapshot()
}

/**
 * When a closing " completes a "..." pair, replace both quotes with «...».
 * Only active when the replaceQuotes prop is true.
 */
function tryReplaceQuotes() {
  const el = textarea.value
  if (!el) {
    return
  }

  const cursorPos = el.selectionStart
  const text = modelValue.value

  // The closing " was just typed at cursorPos - 1.
  const closePos = cursorPos - 1
  if (text[closePos] !== '"') {
    return
  }

  // Count how many " exist before the just-typed one. If the count is even,
  // all previous quotes are already paired and this one opens a new pair.
  let quoteCount = 0
  for (let i = 0; i < closePos; i++) {
    if (text[i] === '"') {
      quoteCount++
    }
  }
  if (quoteCount % 2 === 0) {
    return
  }

  // Find the matching opening ".
  const openPos = text.lastIndexOf('"', closePos - 1)
  if (openPos === -1 || closePos - openPos < 2) {
    return
  }

  const inner = text.slice(openPos + 1, closePos)

  // Don't replace when the content has leading/trailing spaces — that's
  // unlikely to be an intentional quoted phrase (e.g. " Welt ").
  if (inner.startsWith(' ') || inner.endsWith(' ')) {
    return
  }

  // Push undo snapshot before the replacement.
  pushUndoSnapshot()

  modelValue.value =
    text.slice(0, openPos) + '«' + inner + '»' + text.slice(closePos + 1)

  requestAnimationFrame(() => {
    el.setSelectionRange(cursorPos, cursorPos)
  })
}

/**
 * Replace three consecutive dots with an ellipsis character.
 * Called after input, checks if the last typed character completed a "..." sequence.
 */
function tryReplaceEllipsis() {
  const el = textarea.value
  if (!el) {
    return
  }

  const cursorPos = el.selectionStart
  const text = modelValue.value

  if (cursorPos < 3) {
    return
  }

  if (text.slice(cursorPos - 3, cursorPos) !== '...') {
    return
  }

  pushUndoSnapshot()

  const newCursor = cursorPos - 2
  modelValue.value =
    text.slice(0, cursorPos - 3) + '\u2026' + text.slice(cursorPos)

  requestAnimationFrame(() => {
    el.setSelectionRange(newCursor, newCursor)
  })
}

/**
 * Replace two consecutive hyphens with an en dash.
 * Called after input, checks if the last typed character completed a "--" sequence.
 */
function tryReplaceEnDash() {
  const el = textarea.value
  if (!el) {
    return
  }

  const cursorPos = el.selectionStart
  const text = modelValue.value

  if (cursorPos < 2) {
    return
  }

  if (text.slice(cursorPos - 2, cursorPos) !== '--') {
    return
  }

  // Don't replace if there's a third hyphen before (could be intentional).
  if (cursorPos >= 3 && text[cursorPos - 3] === '-') {
    return
  }

  pushUndoSnapshot()

  const newCursor = cursorPos - 1
  modelValue.value =
    text.slice(0, cursorPos - 2) + '\u2013' + text.slice(cursorPos)

  requestAnimationFrame(() => {
    el.setSelectionRange(newCursor, newCursor)
  })
}

// Push initial snapshot on mount and set up input tracking.
onMounted(() => {
  pushSnapshot({
    text: modelValue.value,
    cursor: modelValue.value.length,
  })

  // Listen for native input events to track changes for the undo stack.
  textarea.value?.addEventListener('input', onInput)

  if (props.autofocus && textarea.value) {
    textarea.value.focus()
  }
})

// Also push a snapshot when modelValue changes programmatically (not from
// the textarea input event), e.g. from a paste handler or auto-replace.
watch(modelValue, () => {
  if (restoringSnapshot) {
    return
  }
  if (!modelValue.value) {
    height.value = props.minHeight
  }
})

// Workaround for Chromium bug where CSS transform on a parent breaks textarea
// text selection when the pointer leaves the element.
// https://issues.chromium.org/issues/41439320
function onPointerDown(e: PointerEvent) {
  if (e.target instanceof HTMLElement) {
    e.target.setPointerCapture(e.pointerId)
  }
}

function onKeydown(e: KeyboardEvent) {
  // Handle undo/redo before emitting to parent.
  if ((e.ctrlKey || e.metaKey) && !e.altKey) {
    if (e.key.toLowerCase() === 'z' && !e.shiftKey) {
      e.preventDefault()
      undo()
      return
    }
    if ((e.key.toLowerCase() === 'z' && e.shiftKey) || e.key === 'y') {
      e.preventDefault()
      redo()
      return
    }
  }

  // Auto-replacements: let the browser insert the character first, then check.
  if (shouldReplaceQuotes.value && e.key === '"') {
    requestAnimationFrame(() => {
      tryReplaceQuotes()
    })
  }
  if (textAutoReplace.ellipsis && e.key === '.') {
    requestAnimationFrame(() => {
      tryReplaceEllipsis()
    })
  }
  if (textAutoReplace.enDash && e.key === '-') {
    requestAnimationFrame(() => {
      tryReplaceEnDash()
    })
  }

  emit('keydown', e)
  if (props.submitOnEnter && e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    emit('submit')
  }
}

function onPaste(e: ClipboardEvent) {
  if (!e.clipboardData) return
  const data = new ClipboardData(e.clipboardData)
  if (props.onBeforePaste?.(data)) {
    e.preventDefault()
    return
  }
  if (!props.pasteMarkdown || !data.hasHtml()) return

  e.preventDefault()

  // Save snapshot before paste so it can be undone.
  pushSnapshot()

  const markdown = data.toMarkdown()

  const el = textarea.value
  if (!el) return

  const start = el.selectionStart
  const end = el.selectionEnd
  const before = modelValue.value.slice(0, start)
  const after = modelValue.value.slice(end)

  modelValue.value = before + markdown + after

  const newPos = start + markdown.length
  requestAnimationFrame(() => {
    el.setSelectionRange(newPos, newPos)
    // Snapshot after paste so the pasted state is in history.
    pushSnapshot()
  })
}

onBlokkliEvent('animationFrame', () => {
  const scrollHeight = textarea.value?.scrollHeight ?? props.minHeight
  const newHeight = Math.max(scrollHeight, props.minHeight)
  height.value = props.maxHeight
    ? Math.min(newHeight, props.maxHeight)
    : newHeight
})

defineExpose({
  focus: () => textarea.value?.focus(),
  blur: () => textarea.value?.blur(),
  element: textarea,
})
</script>
