import { defineConfig } from 'vitepress'
import features from './../../playground/.nuxt/blokkli/features.json'
import fs from 'fs'
import path from 'path'

const TYPE_FILES = [
  './../../src/runtime/types/index.ts',
  './../../src/runtime/types/theme.ts',
  './../../src/runtime/types/generatedModuleTypes.ts',
  './../../src/runtime/types/blokkOptions.ts',
  './../../src/runtime/adapter/index.ts',
]

const getTypeFiles = () => {
  const allFiles = TYPE_FILES.flatMap((relativePath) => {
    const rootPath = path.resolve(__dirname, '../..')
    const filePath = path.resolve(__dirname, relativePath)
    const githubUrl = filePath.replace(
      rootPath,
      'https://www.github.com/blokkli/editor/tree/main',
    )
    return fs
      .readFileSync(filePath)
      .toString()
      .split('\n')
      .map((line, index) => {
        const rgx = /(type|interface) ([A-Z][^ <]*)/g
        const typeName = [...line.matchAll(rgx)][0]?.[2]
        if (typeName) {
          return {
            githubUrl: githubUrl + '#L' + (index + 1),
            typeName,
          }
        }
      })
      .filter(Boolean)
  })

  return allFiles.reduce((acc, v) => {
    acc[v.typeName] = v.githubUrl
    return acc
  }, {})
}

const typesMap = getTypeFiles()

const adapterDocs = [
  { text: 'loadState()', link: '/adapter/loadState' },
  { text: 'mapState()', link: '/adapter/mapState' },
  { text: 'getDisabledFeatures()', link: '/adapter/getDisabledFeatures' },
  { text: 'getAllBundles()', link: '/adapter/getAllBundles' },
  { text: 'getFieldConfig()', link: '/adapter/getFieldConfig' },
  { text: 'getEditableFieldConfig()', link: '/adapter/getEditableFieldConfig' },
  {
    text: 'getDroppableFieldConfig()',
    link: '/adapter/getDroppableFieldConfig',
  },
  { text: 'getConversions()', link: '/adapter/getConversions' },
  { text: 'convertBlocks()', link: '/adapter/convertBlocks' },
  { text: 'getTransformPlugins()', link: '/adapter/getTransformPlugins' },
  { text: 'applyTransformPlugin()', link: '/adapter/applyTransformPlugin' },
  { text: 'addNewBlock()', link: '/adapter/addNewBlock' },
  { text: 'updateOptions()', link: '/adapter/updateOptions' },
  {
    text: 'addBlockFromClipboardItem()',
    link: '/adapter/addBlockFromClipboardItem',
  },
  { text: 'moveBlock()', link: '/adapter/moveBlock' },
  { text: 'moveMultipleBlocks()', link: '/adapter/moveMultipleBlocks' },
  { text: 'addLibraryItem()', link: '/adapter/addLibraryItem' },
  { text: 'deleteBlocks()', link: '/adapter/deleteBlocks' },
  { text: 'duplicateBlocks()', link: '/adapter/duplicateBlocks' },
  { text: 'pasteExistingBlocks()', link: '/adapter/pasteExistingBlocks' },
  { text: 'getImportItems()', link: '/adapter/getImportItems' },
  { text: 'importFromExisting()', link: '/adapter/importFromExisting' },
  { text: 'revertAllChanges()', link: '/adapter/revertAllChanges' },
  { text: 'publish()', link: '/adapter/publish' },
  { text: 'setHistoryIndex()', link: '/adapter/setHistoryIndex' },
  { text: 'takeOwnership()', link: '/adapter/takeOwnership' },
  { text: 'loadComments()', link: '/adapter/loadComments' },
  { text: 'addComment()', link: '/adapter/addComment' },
  { text: 'resolveComment()', link: '/adapter/resolveComment' },
  { text: 'makeBlockReusable()', link: '/adapter/makeBlockReusable' },
  { text: 'detachReusableBlock()', link: '/adapter/detachReusableBlock' },
  { text: 'getLibraryItems()', link: '/adapter/getLibraryItems' },
  { text: 'getLastChanged()', link: '/adapter/getLastChanged' },
  { text: 'getPreviewGrantUrl()', link: '/adapter/getPreviewGrantUrl' },
  { text: 'getContentSearchTabs()', link: '/adapter/getContentSearchTabs' },
  {
    text: 'getContentSearchResults()',
    link: '/adapter/getContentSearchResults',
  },
  { text: 'addContentSearchItem()', link: '/adapter/addContentSearchItem' },
  { text: 'changeLanguage()', link: '/adapter/changeLanguage' },
  { text: 'formFrameBuilder()', link: '/adapter/formFrameBuilder' },
  { text: 'updateFieldValue()', link: '/adapter/updateFieldValue' },
  { text: 'buildEditableFrameUrl()', link: '/adapter/buildEditableFrameUrl' },
  { text: 'assistantGetResults()', link: '/adapter/assistantGetResults' },
  {
    text: 'assistantAddBlockFromResult()',
    link: '/adapter/assistantAddBlockFromResult',
  },
  { text: 'getGridMarkup()', link: '/adapter/getGridMarkup' },
  { text: 'mediaLibraryAddBlock()', link: '/adapter/mediaLibraryAddBlock' },
  { text: 'mediaLibraryGetResults()', link: '/adapter/mediaLibraryGetResults' },
].sort((a, b) => a.text.localeCompare(b.text))

function linkPlugin(md) {
  const regex = /\[adapter\.([^\]]+)\]/g

  function replaceToken(tokens, idx) {
    const token = tokens[idx]
    const match = token.content.match(regex)

    if (match) {
      // Extract method name from the match
      const methodName = match[0].slice(9, -1) // Removes [adapter. and ]

      // Replace the content of the current token
      token.type = 'html_inline'
      token.content = `<a href="/adapter/${methodName}">${methodName}</a>`
    }
  }

  md.core.ruler.push('replace_adapter_method', function (state) {
    state.tokens.forEach((blockToken) => {
      if (blockToken.type === 'inline' && blockToken.children) {
        blockToken.children.forEach((token, idx) => {
          replaceToken(blockToken.children, idx)
        })
      }
    })
  })
}

function typeReferencePlugin(md) {
  const regex = /\[type\.(\w+(\[\])?)\]/g

  function replaceToken(tokens, idx) {
    const token = tokens[idx]
    const match = [...token.content.matchAll(regex)][0]

    if (match) {
      console.log(token)
      const arg = match[0].slice(6, -1)
      const typeName = arg.replace('[', '').replace(']', '')

      const githubUrl = typesMap[typeName]

      if (!githubUrl) {
        throw new Error(`Failed to link type with name: "${typeName}"`)
      }

      token.type = 'html_inline'
      token.content = token.content.replace(
        regex,
        `<a href="${githubUrl}" target="_blank"><code>${arg}</code></a>`,
      )
    }
  }

  md.core.ruler.push('replace_type_reference', function (state) {
    state.tokens.forEach((blockToken) => {
      if (blockToken.type === 'inline' && blockToken.children) {
        blockToken.children.forEach((token, idx) => {
          replaceToken(blockToken.children, idx)
        })
      }
    })
  })
}

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'blökkli docs',
  description: 'Documentation for the blökkli page builder',
  markdown: {
    config: (md) => {
      md.use(linkPlugin)
      md.use(typeReferencePlugin)
    },
  },
  // srcDir: 'docs',
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'blokk.li', link: 'https://blokk.li' },
    ],

    sidebar: [
      {
        text: 'Define blocks',
        items: [
          { text: 'defineBlokkli()', link: '/define-blokkli' },
          { text: 'Options', link: '/define-blokkli/options' },
          {
            text: 'Built-in Options',
            link: '/define-blokkli/built-in-options',
          },
          {
            text: 'Context based rendering',
            link: '/define-blokkli/render-for',
          },
          { text: 'Block Context', link: '/define-blokkli/block-context' },
          { text: 'Editable / Droppable', link: '/define-blokkli/editable' },
          { text: 'Editor behaviour', link: '/define-blokkli/editor' },
          { text: 'Proxy Mode', link: '/define-blokkli/proxy-mode' },
        ],
      },
      {
        text: 'Data Structure',
        items: [
          { text: 'Basics', link: '/data-structure/basics' },
          { text: 'Components Data', link: '/data-structure/components' },
          { text: 'Block Options', link: '/data-structure/options' },
          { text: 'Nested Blocks', link: '/data-structure/nested-blocks' },
        ],
      },
      {
        text: 'Editor',
        items: [
          { text: 'Overview', link: '/editor/overview' },
          { text: 'Edit State', link: '/editor/edit-state' },
          { text: 'Features', link: '/editor/features' },
          { text: 'Settings', link: '/editor/settings' },
          { text: 'Themes', link: '/editor/themes' },
          { text: 'Translations', link: '/editor/translations' },
        ],
      },
      {
        text: 'Features',
        collapsed: true,
        items: features
          .filter((v) => v.id !== 'demo-feature')
          .map((v) => {
            return {
              text: v.definition.label,
              link: '/features/' + v.id,
            }
          }),
      },
      {
        text: 'Adapter',
        collapsed: true,
        items: [
          { text: 'Overview', link: '/adapter/overview' },
          { text: 'Minimal Example', link: '/adapter/minimal-example' },
          ...adapterDocs,
        ],
      },
      {
        text: 'Plugins',
        collapsed: true,
        items: [{ text: 'Add Action', link: '/plugins/add-action' }],
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/blokkli/editor' },
    ],
  },
})
