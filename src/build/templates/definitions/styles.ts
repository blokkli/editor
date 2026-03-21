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
          logger.error(`Failed to process module CSS "${filePath}":\n${e.message}`)
        }
      }

      if (processed.length > 0) {
        moduleCSS = '\n/* Module CSS */\n' + processed.join('\n')
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
