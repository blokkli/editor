<template>
  <div ref="rootEl" class="relative" @paste.stop>
    <div
      class="bk-richtext relative overflow-hidden flex flex-col"
      :class="{
        'border border-mono-300 focus-within:border-mono-400 rounded':
          !noBorder,
      }"
    >
      <Toolbar v-if="editor">
        <ToolbarGroup>
          <ToolbarButton
            icon="bk_mdi_undo"
            :label="$t('undo', 'Undo')"
            :disabled="!editor.can().undo()"
            @click="editor.chain().focus().undo().run()"
          />
          <ToolbarButton
            icon="bk_mdi_redo"
            :label="$t('redo', 'Redo')"
            :disabled="!editor.can().redo()"
            @click="editor.chain().focus().redo().run()"
          />
        </ToolbarGroup>
        <ToolbarGroup>
          <ToolbarButton
            icon="bk_mdi_format_bold"
            :label="$t('bold', 'Bold')"
            :active="editor.isActive('bold')"
            :disabled="!editor.can().chain().focus().toggleBold().run()"
            @click="editor.chain().focus().toggleBold().run()"
          />
          <ToolbarButton
            icon="bk_mdi_format_italic"
            :label="$t('italic', 'Italic')"
            :active="editor.isActive('italic')"
            :disabled="!editor.can().chain().focus().toggleItalic().run()"
            @click="editor.chain().focus().toggleItalic().run()"
          />
          <ToolbarButton
            icon="bk_mdi_format_strikethrough"
            :label="$t('strikethrough', 'Strikethrough')"
            :active="editor.isActive('strike')"
            :disabled="!editor.can().chain().focus().toggleStrike().run()"
            @click="editor.chain().focus().toggleStrike().run()"
          />
          <ToolbarButton
            icon="bk_mdi_code"
            :label="$t('inlineCode', 'Inline code')"
            :active="editor.isActive('code')"
            :disabled="!editor.can().chain().focus().toggleCode().run()"
            @click="editor.chain().focus().toggleCode().run()"
          />
        </ToolbarGroup>
        <ToolbarGroup>
          <ToolbarButton
            icon="bk_mdi_format_list_bulleted"
            :label="$t('bulletedList', 'Bulleted list')"
            :active="editor.isActive('bulletList')"
            :disabled="!editor.can().chain().focus().toggleBulletList().run()"
            @click="editor.chain().focus().toggleBulletList().run()"
          />
          <ToolbarButton
            icon="bk_mdi_format_list_numbered"
            :label="$t('numberedList', 'Numbered list')"
            :active="editor.isActive('orderedList')"
            :disabled="!editor.can().chain().focus().toggleOrderedList().run()"
            @click="editor.chain().focus().toggleOrderedList().run()"
          />
          <ToolbarButton
            icon="bk_mdi_checklist"
            :label="$t('taskList', 'Task list')"
            :active="editor.isActive('taskList')"
            :disabled="!editor.can().chain().focus().toggleTaskList().run()"
            @click="editor.chain().focus().toggleTaskList().run()"
          />
          <ToolbarButton
            icon="bk_mdi_format_quote"
            :label="$t('blockquote', 'Blockquote')"
            :active="editor.isActive('blockquote')"
            :disabled="!editor.can().chain().focus().toggleBlockquote().run()"
            @click="editor.chain().focus().toggleBlockquote().run()"
          />
        </ToolbarGroup>
        <ToolbarGroup>
          <ToolbarButton
            icon="bk_mdi_link"
            :label="$t('link', 'Link')"
            :active="editor.isActive('link')"
            :disabled="!canToggleLink"
            @click="onToggleLink"
          />
        </ToolbarGroup>
      </Toolbar>
      <div
        class="flex-1 overflow-auto bk-scrollbar-light relative overscroll-contain"
      >
        <EditorContent
          :editor="editor"
          class="bk-richtext-content min-h-[160px] max-h-[400px]"
        />
      </div>

      <Transition name="bk-richtext-panel">
        <PanelLink
          v-if="linkEditor"
          :initial-href="linkEditor.initialHref"
          @save="onSaveLink"
          @cancel="onCancelLink"
          @remove="onRemoveLink"
        />
      </Transition>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  useBlokkli,
  useTemplateRef,
} from '#imports'
import { Editor, EditorContent, VueRenderer } from '@tiptap/vue-3'
import type { Component } from 'vue'
import { posToDOMRect, type Extensions } from '@tiptap/core'
import { computePosition, flip, shift } from '@floating-ui/dom'
import StarterKit from '@tiptap/starter-kit'
import Mention from '@tiptap/extension-mention'
import Emoji, { gitHubEmojis } from '@tiptap/extension-emoji'
import TaskList from '@tiptap/extension-task-list'
import MentionList, { type MentionItem } from './SuggestionList/Mentions.vue'
import EmojiList from './SuggestionList/Emojis.vue'
import Toolbar from './Toolbar/index.vue'
import ToolbarButton from './Toolbar/Button/index.vue'
import ToolbarGroup from './Toolbar/Group/index.vue'
import PanelLink from './Panel/Link/index.vue'
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

const { $t } = useBlokkli()

const editor = shallowRef<Editor | undefined>()
const linkEditor = ref<{ initialHref: string } | null>(null)
const rootEl = useTemplateRef<HTMLElement>('rootEl')

/**
 * Generic Tiptap suggestion `render` factory: mounts `ListComponent` via
 * VueRenderer, positions it with floating-ui (flip + shift), and forwards
 * key events to the component's exposed `onKeyDown`. Used for both
 * `@`-mentions and `:`-emoji pickers.
 */
function buildSuggestionRender(ListComponent: Component) {
  return () => {
    let renderer: VueRenderer | null = null

    function updatePosition(editor: Editor, element: HTMLElement) {
      const virtualElement = {
        getBoundingClientRect: () =>
          posToDOMRect(
            editor.view,
            editor.state.selection.from,
            editor.state.selection.to,
          ),
      }
      computePosition(virtualElement, element, {
        placement: 'bottom-start',
        strategy: 'absolute',
        middleware: [shift(), flip()],
      }).then(({ x, y, strategy }) => {
        element.style.position = strategy
        element.style.left = `${x}px`
        element.style.top = `${y}px`
      })
    }

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
        element.style.position = 'absolute'
        rootEl.value.appendChild(element)
        updatePosition(suggestProps.editor, element)
      },
      onUpdate: (suggestProps: any) => {
        renderer?.updateProps({
          items: suggestProps.items,
          command: suggestProps.command,
        })
        const element = renderer?.element as HTMLElement | null
        if (element) {
          updatePosition(suggestProps.editor, element)
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
    onEditLink()
    return
  }
  if (editor.value.state.selection.empty) {
    return
  }
  linkEditor.value = { initialHref: '' }
}

function onEditLink() {
  if (!editor.value) {
    return
  }
  const current =
    (editor.value.getAttributes('link').href as string | undefined) ?? ''
  linkEditor.value = { initialHref: current }
}

function onSaveLink({ href }: { href: string }) {
  if (!editor.value) {
    return
  }
  editor.value.chain().focus().extendMarkRange('link').setLink({ href }).run()
  linkEditor.value = null
}

function onCancelLink() {
  linkEditor.value = null
  editor.value?.chain().focus().run()
}

function onRemoveLink() {
  if (!editor.value) {
    return
  }
  editor.value.chain().focus().extendMarkRange('link').unsetLink().run()
  linkEditor.value = null
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

<style lang="postcss">
.bk-richtext-panel-enter-active,
.bk-richtext-panel-leave-active {
  @apply transition ease-swing duration-300;
  .bk-richtext-panel-inner {
    @apply transition ease-swing duration-300;
  }
}
.bk-richtext-panel-enter-from,
.bk-richtext-panel-leave-to {
  @apply opacity-0;
  .bk-richtext-panel-inner {
    @apply scale-90;
  }
}
</style>
