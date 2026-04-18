import { useLogger } from '@nuxt/kit'
import { defineFileTemplate } from '../defineTemplate'
import { processCSS, resetProcessor } from '../../processCSS'

const logger = useLogger('@blokkli/editor')

export default defineFileTemplate(
  'styles.css',
  async (ctx) => {
    const cssFilePath = ctx.helper.resolvers.module.resolve(
      './runtime/editor/css/output.css',
    )

    let moduleCSS = ''

    const cssFiles = ctx.getCSSFiles()
    if (cssFiles.length > 0) {
      // Reset the processor so postcss-import re-reads partials from disk.
      resetProcessor()

      const processed: string[] = []
      for (const filePath of cssFiles) {
        const content = await ctx.helper.fileCache.read(filePath)
        try {
          const result = await processCSS(content, filePath)
          processed.push(result)
        } catch (e: any) {
          logger.error(
            `Failed to process module CSS "${filePath}":\n${e.message}`,
          )
        }
      }

      if (processed.length > 0) {
        moduleCSS = '\n/* Module CSS */\n' + processed.join('\n')
      }
    }

    // Generate Tailwind utilities for user-land module content paths.
    // This ensures that utility classes used in module Vue templates
    // are available in the CSS output (mangled and scoped to .bk).
    const contentPaths = ctx.getContentPaths()
    if (contentPaths.length > 0) {
      try {
        const utilities = await processCSS(
          '@tailwind utilities;',
          'module-utilities.css',
          contentPaths,
        )
        if (utilities.trim()) {
          moduleCSS += '\n/* Module Utilities */\n' + utilities
        }
      } catch (e: any) {
        logger.error(
          `Failed to generate utilities for module content paths:\n${e.message}`,
        )
      }
    }

    return `
@import url("${cssFilePath}");

${ctx.theme.css}
${moduleCSS}
`
  },
  { dependencies: ['module-css'] },
)
