<template>
  <FileDropHandler
    icon="bk_mdi_attach_file"
    :label="$t('aiAgentDropFiles', 'Drop files to attach')"
    :accept="acceptTextFile"
    @drop="onDrop"
  >
    <slot />
  </FileDropHandler>
</template>

<script lang="ts" setup>
import { useBlokkli } from '#imports'
import { FileDropHandler } from '#blokkli/editor/components'
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
  const [mammoth, { default: TurndownService }] = await Promise.all([
    import('mammoth'),
    import('turndown'),
  ])
  const arrayBuffer = await file.arrayBuffer()
  const { value: html } = await mammoth.convertToHtml(
    { arrayBuffer },
    {
      convertImage: mammoth.images.imgElement(() =>
        Promise.resolve({ src: '' }),
      ),
    },
  )
  const turndown = new TurndownService({ headingStyle: 'atx' })
  const markdown = turndown.turndown(html)
  const cleaned = markdown.replace(/!\[[^\]]*\]\([^)]*\)/g, '').trim()
  return cleaned
}

function acceptTextFile(item: DataTransferItem): boolean {
  if (item.kind !== 'file') return false
  if (
    item.type.startsWith('text/') ||
    TEXT_MIME_TYPES.has(item.type) ||
    item.type === DOCX_MIME
  ) {
    return true
  }
  if (!item.type) return true
  return false
}

async function onDrop(files: File[]) {
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
