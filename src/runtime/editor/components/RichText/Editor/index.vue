<template>
  <div ref="rootEl" class="relative" @paste.stop>
    <div
      class="bk-richtext relative rounded bg-white overflow-hidden"
      :class="{
        'border border-mono-300 focus-within:border-mono-400': !noBorder,
      }"
    >
      <div
        v-if="editor"
        class="bk-richtext-toolbar flex items-center border-b border-mono-200 bg-mono-100 overflow-hidden"
      >
        <ToolbarGroup>
          <ToolbarButton
            icon="bk_mdi_undo"
            label="Undo"
            :disabled="!editor.can().undo()"
            @click="editor.chain().focus().undo().run()"
          />
          <ToolbarButton
            icon="bk_mdi_redo"
            label="Redo"
            :disabled="!editor.can().redo()"
            @click="editor.chain().focus().redo().run()"
          />
        </ToolbarGroup>
        <ToolbarGroup>
          <ToolbarButton
            icon="bk_mdi_format_bold"
            label="Bold"
            :active="editor.isActive('bold')"
            :disabled="!editor.can().chain().focus().toggleBold().run()"
            @click="editor.chain().focus().toggleBold().run()"
          />
          <ToolbarButton
            icon="bk_mdi_format_italic"
            label="Italic"
            :active="editor.isActive('italic')"
            :disabled="!editor.can().chain().focus().toggleItalic().run()"
            @click="editor.chain().focus().toggleItalic().run()"
          />
          <ToolbarButton
            icon="bk_mdi_format_strikethrough"
            label="Strikethrough"
            :active="editor.isActive('strike')"
            :disabled="!editor.can().chain().focus().toggleStrike().run()"
            @click="editor.chain().focus().toggleStrike().run()"
          />
          <ToolbarButton
            icon="bk_mdi_code"
            label="Inline code"
            :active="editor.isActive('code')"
            :disabled="!editor.can().chain().focus().toggleCode().run()"
            @click="editor.chain().focus().toggleCode().run()"
          />
        </ToolbarGroup>
        <ToolbarGroup>
          <ToolbarButton
            icon="bk_mdi_format_list_bulleted"
            label="Bulleted list"
            :active="editor.isActive('bulletList')"
            :disabled="!editor.can().chain().focus().toggleBulletList().run()"
            @click="editor.chain().focus().toggleBulletList().run()"
          />
          <ToolbarButton
            icon="bk_mdi_format_list_numbered"
            label="Numbered list"
            :active="editor.isActive('orderedList')"
            :disabled="!editor.can().chain().focus().toggleOrderedList().run()"
            @click="editor.chain().focus().toggleOrderedList().run()"
          />
          <ToolbarButton
            icon="bk_mdi_checklist"
            label="Task list"
            :active="editor.isActive('taskList')"
            :disabled="!editor.can().chain().focus().toggleTaskList().run()"
            @click="editor.chain().focus().toggleTaskList().run()"
          />
          <ToolbarButton
            icon="bk_mdi_format_quote"
            label="Blockquote"
            :active="editor.isActive('blockquote')"
            :disabled="!editor.can().chain().focus().toggleBlockquote().run()"
            @click="editor.chain().focus().toggleBlockquote().run()"
          />
        </ToolbarGroup>
        <ToolbarGroup>
          <ToolbarButton
            icon="bk_mdi_link"
            label="Link"
            :active="editor.isActive('link')"
            :disabled="!canToggleLink"
            @click="onToggleLink"
          />
        </ToolbarGroup>
      </div>
      <EditorContent :editor="editor" class="bk-richtext-content" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import {
  computed,
  onBeforeUnmount,
  onMounted,
  shallowRef,
  useTemplateRef,
} from '#imports'
import { Editor, EditorContent, VueRenderer } from '@tiptap/vue-3'
import type { Component } from 'vue'
import type { Extensions } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Mention from '@tiptap/extension-mention'
import Emoji, { gitHubEmojis } from '@tiptap/extension-emoji'
import TaskList from '@tiptap/extension-task-list'
import MentionList, { type MentionItem } from './MentionList.vue'
import EmojiList from './EmojiList.vue'
import ToolbarButton from './ToolbarButton.vue'
import ToolbarGroup from './ToolbarGroup.vue'
import { CleanTaskItem } from './CleanTaskItem'

const props = withDefaults(
  defineProps<{
    initialValue?: string
    getUsers?: () => Promise<MentionItem[]>
    autofocus?: boolean
    noBorder?: boolean
  }>(),
  {
    initialValue: '',
    autofocus: false,
    getUsers: undefined,
  },
)

const emit = defineEmits<{
  change: [{ html: string; isEmpty: boolean }]
}>()

const editor = shallowRef<Editor | undefined>()
const rootEl = useTemplateRef<HTMLElement>('rootEl')

function positionPopup(
  element: HTMLElement,
  clientRect: (() => DOMRect | null) | null | undefined,
) {
  if (!clientRect || !rootEl.value) {
    return
  }
  const caret = clientRect()
  if (!caret) {
    return
  }
  const root = rootEl.value.getBoundingClientRect()
  const popup = element.getBoundingClientRect()

  // Default: below the caret, left-aligned to it.
  let x = caret.left - root.left
  let y = caret.bottom - root.top + 4

  // Clamp horizontally so the popup never exceeds the editor frame.
  const maxX = Math.max(0, root.width - popup.width)
  if (x > maxX) {
    x = maxX
  }
  if (x < 0) {
    x = 0
  }

  // If the popup would overflow the bottom edge, flip it above the caret —
  // but only when there's actually room above. Otherwise keep it below.
  if (y + popup.height > root.height) {
    const above = caret.top - root.top - popup.height - 4
    if (above >= 0) {
      y = above
    }
  }

  element.style.left = `${x}px`
  element.style.top = `${y}px`
}

/**
 * Generic Tiptap suggestion `render` factory: mounts `ListComponent` via
 * VueRenderer, positions it relative to `rootEl`, and forwards key events
 * to the component's exposed `onKeyDown`. Used for both `@`-mentions and
 * `:`-emoji pickers.
 */
function buildSuggestionRender(ListComponent: Component) {
  return () => {
    let renderer: VueRenderer | null = null
    return {
      onStart: (suggestProps: any) => {
        renderer = new VueRenderer(ListComponent, {
          props: {
            items: suggestProps.items,
            command: suggestProps.command,
          },
          editor: suggestProps.editor,
        })
        const element = renderer.element as HTMLElement | null
        if (!element || !rootEl.value) {
          return
        }
        rootEl.value.appendChild(element)
        positionPopup(element, suggestProps.clientRect)
      },
      onUpdate: (suggestProps: any) => {
        renderer?.updateProps({
          items: suggestProps.items,
          command: suggestProps.command,
        })
        const element = renderer?.element as HTMLElement | null
        if (element) {
          positionPopup(element, suggestProps.clientRect)
        }
      },
      onKeyDown: (suggestProps: { event: KeyboardEvent }) => {
        if (suggestProps.event.key === 'Escape') {
          ;(renderer?.element as HTMLElement | null)?.remove()
          renderer?.destroy()
          renderer = null
          return true
        }
        const ref = renderer?.ref as
          | { onKeyDown: (p: { event: KeyboardEvent }) => boolean }
          | undefined
        return ref?.onKeyDown(suggestProps) ?? false
      },
      onExit: () => {
        ;(renderer?.element as HTMLElement | null)?.remove()
        renderer?.destroy()
        renderer = null
      },
    }
  }
}

function buildMentionExtension(getUsers: () => Promise<MentionItem[]>) {
  return Mention.configure({
    HTMLAttributes: { class: 'bk-richtext-mention' },
    renderText({ node }) {
      return `@${node.attrs.label ?? node.attrs.id}`
    },
    suggestion: {
      items: async ({ query }) => {
        const all = await getUsers()
        return all
          .filter((u) => u.label.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 6)
      },
      render: buildSuggestionRender(MentionList),
    },
  })
}

// `@tiptap/extension-emoji` runs a canvas-based check (via `is-emoji-supported`)
// to decide whether to render the unicode glyph or fall back to a CDN image.
// That detection misfires on a lot of OS/font combos, leaving plain emoji as
// images. Trust the browser's font: force `isSupported` to true so the
// renderer prefers the unicode `emoji` field whenever it exists. Entries with
// no unicode (custom GitHub emojis like `:octocat:`) still use the image.
const ConfiguredEmoji = Emoji.extend({
  addStorage() {
    const parent = this.parent!()
    return {
      ...parent,
      isSupported: () => true,
    }
  },
})

function buildEmojiExtension() {
  return ConfiguredEmoji.configure({
    emojis: gitHubEmojis,
    enableEmoticons: true,
    suggestion: {
      items: ({ editor, query }) => {
        const q = query.toLowerCase()
        return (editor.storage.emoji.emojis as any[])
          .filter(
            (e) =>
              e.shortcodes?.some((s: string) => s.startsWith(q)) ||
              e.tags?.some((t: string) => t.startsWith(q)),
          )
          .slice(0, 6)
      },
      render: buildSuggestionRender(EmojiList),
    },
  })
}

onMounted(() => {
  const extensions: Extensions = [
    StarterKit.configure({
      heading: false,
      codeBlock: false,
      horizontalRule: false,
      trailingNode: false,
      link: {
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
      },
    }),
    TaskList,
    CleanTaskItem.configure({ nested: true }),
    buildEmojiExtension(),
  ]
  if (props.getUsers) {
    extensions.push(buildMentionExtension(props.getUsers))
  }

  editor.value = new Editor({
    content: props.initialValue,
    autofocus: props.autofocus ? 'end' : false,
    editorProps: {
      attributes: {
        class: 'bk-rich-content bk-prose-mirror',
      },
    },
    extensions,
    onUpdate: ({ editor }) => {
      emit('change', { html: editor.getHTML(), isEmpty: editor.isEmpty })
    },
  })
})

defineExpose({
  getHTML: (): string => editor.value?.getHTML() ?? '',
  isEmpty: (): boolean => editor.value?.isEmpty ?? true,
})

const canToggleLink = computed(() => {
  const e = editor.value
  if (!e) {
    return false
  }
  if (e.isActive('link')) {
    return true
  }
  return !e.state.selection.empty
})

function onToggleLink() {
  if (!editor.value) {
    return
  }
  if (editor.value.isActive('link')) {
    editor.value.chain().focus().unsetLink().run()
    return
  }
  const url = window.prompt('URL')
  if (!url) {
    return
  }
  editor.value
    .chain()
    .focus()
    .extendMarkRange('link')
    .setLink({ href: url })
    .run()
}

onBeforeUnmount(() => {
  editor.value?.destroy()
})
</script>

<script lang="ts">
export default {
  name: 'RichText',
}
</script>
