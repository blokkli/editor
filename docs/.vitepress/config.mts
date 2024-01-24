import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "blokkli-docs",
  description: "blökkli Docs",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Examples', link: '/markdown-examples' }
    ],

    sidebar: [
      {
        text: 'Define blocks',
        items: [
          { text: 'defineBlokkli()', link: '/define-blokkli' },
          { text: 'Options', link: '/define-blokkli/options' },
          { text: 'Block Context', link: '/define-blokkli/block-context' },
          { text: 'Editor behaviour', link: '/define-blokkli/editor' },
        ]
      },
      {
        text: 'Data Structure',
        items: [
          { text: 'Basics', link: '/data-structure/basics' },
          { text: 'Components Data', link: '/data-structure/components' },
          { text: 'Block Options', link: '/data-structure/options' },
          { text: 'Nested Blocks', link: '/data-structure/nested-blocks' },
        ]
      },
      {
        text: 'Editor',
        items: [
          { text: 'Overview', link: '/editor/overview' },
          { text: 'Features', link: '/editor/features' },
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/vuejs/vitepress' }
    ]
  }
})
