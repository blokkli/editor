<template>
  <div
    @dragenter.stop.prevent="onDragEnter"
    @dragleave.stop="onDragLeave"
    @dragover.stop.prevent="onDragOver"
    @drop.stop.prevent="onDrop"
  >
    <slot />
    <Transition name="bk-agent-drop" :duration="200">
      <div v-if="isDragOver" class="bk-agent-drop-overlay">
        <div class="bk-agent-drop-overlay-backdrop" />
        <div class="bk-agent-drop-overlay-content">
          <Icon name="bk_mdi_attach_file" />
          <span>{{ $t('aiAgentDropFiles', 'Drop files to attach') }}</span>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script lang="ts" setup>
import { ref, useBlokkli } from '#imports'
import { Icon } from '#blokkli/editor/components'
import { generateUUID } from '#blokkli/editor/helpers/uuid'
import type { Attachment, AttachmentFormat } from '#blokkli/agent/app/types'

const emit = defineEmits<{
  drop: [attachments: Attachment[]]
}>()

const { $t } = useBlokkli()

const TEXT_MIME_TYPES = new Set([
  'application/json',
  'application/xml',
  'application/javascript',
  'application/typescript',
  'application/x-yaml',
  'application/x-sh',
  'application/sql',
  'application/graphql',
  'application/toml',
])

const TEXT_EXTENSIONS = new Set([
  'txt',
  'md',
  'json',
  'xml',
  'yml',
  'yaml',
  'js',
  'ts',
  'jsx',
  'tsx',
  'vue',
  'svelte',
  'css',
  'scss',
  'less',
  'html',
  'htm',
  'csv',
  'tsv',
  'sh',
  'bash',
  'zsh',
  'fish',
  'py',
  'rb',
  'php',
  'java',
  'kt',
  'go',
  'rs',
  'c',
  'cpp',
  'h',
  'hpp',
  'cs',
  'swift',
  'sql',
  'graphql',
  'gql',
  'toml',
  'ini',
  'cfg',
  'conf',
  'env',
  'gitignore',
  'dockerignore',
  'editorconfig',
  'eslintrc',
  'prettierrc',
  'log',
  'diff',
  'patch',
])

const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

function isDocxFile(file: File): boolean {
  if (file.type === DOCX_MIME) return true
  return file.name.toLowerCase().endsWith('.docx')
}

const CODE_EXTENSIONS = new Set([
  'js',
  'ts',
  'jsx',
  'tsx',
  'vue',
  'svelte',
  'css',
  'scss',
  'less',
  'py',
  'rb',
  'php',
  'java',
  'kt',
  'go',
  'rs',
  'c',
  'cpp',
  'h',
  'hpp',
  'cs',
  'swift',
  'sh',
  'bash',
  'zsh',
  'fish',
  'sql',
  'graphql',
  'gql',
  'json',
  'xml',
  'yaml',
  'yml',
  'toml',
  'ini',
  'cfg',
  'conf',
  'diff',
  'patch',
])

function getFileFormat(file: File): AttachmentFormat {
  if (isDocxFile(file)) return 'markdown'
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  if (ext === 'md') return 'markdown'
  if (ext === 'html' || ext === 'htm') return 'html'
  if (ext === 'csv' || ext === 'tsv') return 'csv'
  if (CODE_EXTENSIONS.has(ext)) return 'code'
  if (file.type === 'application/json' || file.type === 'application/xml') {
    return 'code'
  }
  return 'plaintext'
}

function isTextFile(file: File): boolean {
  if (file.type.startsWith('text/')) return true
  if (TEXT_MIME_TYPES.has(file.type)) return true
  if (isDocxFile(file)) return true
  if (!file.type) {
    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    return TEXT_EXTENSIONS.has(ext)
  }
  return false
}

async function extractDocxText(file: File): Promise<string> {
  const mammoth = await import('mammoth')
  const arrayBuffer = await file.arrayBuffer()
  const { value } = await mammoth.convertToMarkdown({
    arrayBuffer,
    convertImage: mammoth.images.imgElement(() => Promise.resolve({ src: '' })),
  })
  // Strip any leftover image markdown (e.g. ![](data:...)) or bare data URIs.
  const cleaned = value.replace(/!\[[^\]]*\]\([^)]*\)/g, '').trim()
  console.log('[DropHandler] DOCX Markdown:', cleaned)
  return cleaned
}

let dragCounter = 0
const isDragOver = ref(false)

function hasTextItems(dt: DataTransfer): boolean {
  for (const item of dt.items) {
    if (item.kind !== 'file') continue
    // Accept if MIME type is text-like.
    if (
      item.type.startsWith('text/') ||
      TEXT_MIME_TYPES.has(item.type) ||
      item.type === DOCX_MIME
    ) {
      return true
    }
    // Accept if MIME type is empty (browser doesn't know — we'll check the
    // extension on drop).
    if (!item.type) return true
  }
  return false
}

function onDragEnter(e: DragEvent) {
  dragCounter++
  if (e.dataTransfer?.types.includes('Files') && hasTextItems(e.dataTransfer)) {
    isDragOver.value = true
  }
}

function onDragLeave() {
  dragCounter--
  if (dragCounter <= 0) {
    dragCounter = 0
    isDragOver.value = false
  }
}

function onDragOver(e: DragEvent) {
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'copy'
  }
}

async function onDrop(e: DragEvent) {
  dragCounter = 0
  isDragOver.value = false

  const files = e.dataTransfer?.files
  if (!files?.length) return

  const dropped: Attachment[] = []

  for (const file of files) {
    if (!isTextFile(file)) continue
    const content = isDocxFile(file)
      ? await extractDocxText(file)
      : await file.text()
    dropped.push({
      type: 'text',
      id: generateUUID(),
      content: `--- File: ${file.name} ---\n${content}`,
      format: getFileFormat(file),
    })
  }

  if (dropped.length) {
    emit('drop', dropped)
  }
}
</script>
