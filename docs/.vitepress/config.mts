import { defineConfig, type MarkdownRenderer } from 'vitepress'
import features from './../../.nuxt/blokkli/features-data.json'
import fs from 'fs'
import path from 'path'

type RuleCore = Parameters<MarkdownRenderer['core']['ruler']['push']>[1]
type StateCore = Parameters<RuleCore>[0]
type Token = StateCore['tokens'][number]

const TYPE_FILES = [
  './../../src/runtime/types/index.ts',
  './../../src/runtime/types/definitions.ts',
  './../../src/runtime/types/blockOptions.ts',
  './../../src/runtime/editor/providers/theme.ts',
  './../../src/runtime/editor/adapter/index.ts',
  './../../src/runtime/editor/types/state.ts',
  './../../src/build/templates/definitions/moduleTypes.ts',
  './../../src/global/types/definitions.ts',
]

const featureMenuItems = features
  .filter((v) => v.definition.id !== 'demo-feature')
  .map((v) => {
    return {
      text: v.definition.label,
      link: '/features/' + v.definition.id,
    }
  })

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

  return allFiles.reduce<Record<string, string>>((acc, v) => {
    if (v) acc[v.typeName] = v.githubUrl
    return acc
  }, {})
}

const typesMap = getTypeFiles()

const getAdapterDocs = () => {
  const adapterDocsPath = path.resolve(__dirname, '../adapter')
  const files = fs.readdirSync(adapterDocsPath)

  // Exclude overview and minimal-example as they're listed separately
  const excludeFiles = ['overview.md', 'minimal-example.md']

  return files
    .filter((file) => file.endsWith('.md') && !excludeFiles.includes(file))
    .map((file) => {
      const name = file.replace('.md', '')
      return {
        text: name,
        link: `/adapter/${name}`,
      }
    })
    .sort((a, b) => a.text.localeCompare(b.text))
}

const adapterDocs = getAdapterDocs()

const getPluginDocs = () => {
  const pluginDocsPath = path.resolve(__dirname, '../plugins')
  const files = fs.readdirSync(pluginDocsPath)

  return files
    .filter((file) => file.endsWith('.md'))
    .map((file) => {
      const name = file.replace('.md', '')
      // Convert kebab-case to Title Case for display
      const displayName = name
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
      return {
        text: displayName,
        link: `/plugins/${name}`,
      }
    })
    .sort((a, b) => a.text.localeCompare(b.text))
}

const pluginDocs = getPluginDocs()

function linkPlugin(md: MarkdownRenderer) {
  const regex = /\[adapter\.([^\]]+)\]/g

  function replaceToken(tokens: Token[], idx: number) {
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
        blockToken.children.forEach((_token, idx) => {
          replaceToken(blockToken.children!, idx)
        })
      }
    })
  })
}

function typeReferencePlugin(md: MarkdownRenderer) {
  const regex = /\[type\.(\w+(\[\])?)\]/g

  function replaceToken(tokens: Token[], idx: number) {
    const token = tokens[idx]
    const match = [...token.content.matchAll(regex)][0]

    if (match) {
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
        blockToken.children.forEach((_token, idx) => {
          replaceToken(blockToken.children!, idx)
        })
      }
    })
  })
}

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'blökkli docs',
  description: 'Documentation for the blökkli page builder',
  vite: {
    css: {
      // The repo root has a postcss.config.cjs targeted at the editor build
      // (Tailwind, class mangling, scoping `*` selectors to `.bk *`). Vite
      // would otherwise auto-discover it and apply it to vitepress's CSS,
      // wiping out the default theme styles.
      postcss: { plugins: [] },
    },
  },
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
      { text: 'Modules', link: '/modules/' },
      { text: 'blokk.li', link: 'https://blokk.li' },
    ],

    sidebar: {
      // Modules section — every module (including the previously top-level
      // agent and drupal docs) lives under /modules/ and gets its own sidebar.
      '/modules/': [
        {
          text: 'Modules',
          items: [{ text: 'Overview', link: '/modules/' }],
        },
        {
          text: 'Authoring a Module',
          collapsed: true,
          items: [
            { text: 'Overview', link: '/modules/authoring/' },
            {
              text: 'Complex Option Types',
              link: '/modules/authoring/complex-option-types',
            },
          ],
        },
        {
          text: 'Agent',
          collapsed: true,
          items: [
            { text: 'Overview', link: '/modules/agent/overview' },
            { text: 'Quick Start', link: '/modules/agent/quick-start' },
            { text: 'Configuration', link: '/modules/agent/configuration' },
            { text: 'Adapter', link: '/modules/agent/adapter' },
            { text: 'Custom Tools', link: '/modules/agent/custom-tools' },
            { text: 'Custom Skills', link: '/modules/agent/custom-skills' },
            {
              text: 'Prompts & System Prompts',
              link: '/modules/agent/custom-prompts',
            },
            { text: 'Architecture', link: '/modules/agent/architecture' },
          ],
        },
        {
          text: 'Charts',
          collapsed: true,
          items: [
            { text: 'Overview', link: '/modules/charts/' },
            { text: 'Setup', link: '/modules/charts/setup' },
            { text: 'Chart Types', link: '/modules/charts/chart-types' },
            {
              text: 'Custom Chart Types',
              link: '/modules/charts/custom-chart-types',
            },
            { text: 'Data Sources', link: '/modules/charts/data-sources' },
            { text: 'Agent Integration', link: '/modules/charts/agent' },
          ],
        },
        {
          text: 'Drupal',
          collapsed: true,
          items: [
            { text: 'Overview', link: '/modules/drupal/overview' },
            {
              text: 'Getting Started',
              link: '/modules/drupal/getting-started',
            },
            { text: 'GraphQL Fragments', link: '/modules/drupal/graphql' },
            { text: 'Page Components', link: '/modules/drupal/pages' },
            { text: 'Block Components', link: '/modules/drupal/blocks' },
            { text: 'Configuration', link: '/modules/drupal/configuration' },
            { text: 'FAQ & Troubleshooting', link: '/modules/drupal/faq' },
          ],
        },
        {
          text: 'Iframes',
          collapsed: true,
          items: [
            { text: 'Overview', link: '/modules/iframes/' },
            { text: 'Setup', link: '/modules/iframes/setup' },
          ],
        },
        {
          text: 'Readability',
          collapsed: true,
          items: [
            { text: 'Overview', link: '/modules/readability/' },
            {
              text: 'Custom Analyzer',
              link: '/modules/readability/custom-analyzer',
            },
          ],
        },
        {
          text: 'Table of Contents',
          collapsed: true,
          items: [{ text: 'Overview', link: '/modules/table-of-contents/' }],
        },
        {
          text: 'Tailwind',
          collapsed: true,
          items: [{ text: 'Overview', link: '/modules/tailwind/' }],
        },
      ],

      // Default docs sidebar for everything else.
      '/': [
        {
          text: 'Getting Started',
          items: [{ text: 'Configuration', link: '/configuration' }],
        },
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
            { text: 'Icons', link: '/define-blokkli/icons' },
            { text: 'Proxy Mode', link: '/define-blokkli/proxy-mode' },
            {
              text: 'import.meta.blokkliEditing',
              link: '/define-blokkli/blokkli-editing',
            },
            { text: 'Query Blocks', link: '/define-blokkli/query-blocks' },
            { text: 'Fragments', link: '/define-blokkli/fragments' },
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
          text: 'Components',
          items: [
            { text: 'BlokkliProvider', link: '/components/BlokkliProvider' },
            { text: 'BlokkliField', link: '/components/BlokkliField' },
            { text: 'BlokkliEditable', link: '/components/BlokkliEditable' },
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
          items: featureMenuItems,
        },
        {
          text: 'Adapter',
          collapsed: true,
          items: [
            { text: 'Overview', link: '/adapter/overview' },
            {
              text: 'Minimal Example',
              link: '/adapter/minimal-example',
            },
            ...adapterDocs,
          ],
        },
        {
          text: 'Plugins',
          collapsed: true,
          items: pluginDocs,
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/blokkli/editor' },
    ],
  },
})
