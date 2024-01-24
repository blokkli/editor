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
      },
      {
        text: 'Adapter',
        items: [
          { text: 'Overview', link: '/adapter/overview' },
          { text: 'loadState()', link: '/adapter/loadState' },
          { text: 'mapState()', link: '/adapter/mapState' },
          { text: 'getDisablesFeatures()', link: '/adapter/getDisablesFeatures' },
          { text: 'getAllBundles()', link: '/adapter/getAllBundles' },
          { text: 'getFieldConfig()', link: '/adapter/getFieldConfig' },
          { text: 'getEditableFieldConfig()', link: '/adapter/getEditableFieldConfig' },
          { text: 'getConversions()', link: '/adapter/getConversions' },
          { text: 'convertBlocks()', link: '/adapter/convertBlocks' },
          { text: 'getTransformPlugins()', link: '/adapter/getTransformPlugins' },
          { text: 'applyTransformPlugin()', link: '/adapter/applyTransformPlugin' },
          { text: 'addNewBlock()', link: '/adapter/addNewBlock' },
          { text: 'updateOptions()', link: '/adapter/updateOptions' },
          { text: 'addBlockFromClipboardItem()', link: '/adapter/addBlockFromClipboardItem' },
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
          { text: 'getContentSearchResults()', link: '/adapter/getContentSearchResults' },
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/vuejs/vitepress' }
    ]
  }
})
