import { useLogger } from '@nuxt/kit'
import { defineFileTemplate } from '../defineTemplate'
import { processCSS, resetProcessor } from '../../processCSS'
import { withTailwindConfig } from '../../mangleTransform'

const logger = useLogger('@blokkli/editor')

export default defineFileTemplate(
  'styles.css',
  async (ctx) => {
    const cssFilePath = ctx.helper.resolvers.module.resolve(
      './runtime/editor/css/output.css',
    )

    let moduleCSS = ''

    const tailwindConfigPath = ctx.helper.getTailwindConfigPath()
    const cssFiles = ctx.getCSSFiles()
    if (cssFiles.length > 0) {
      // Reset the processor so postcss-import re-reads partials from disk.
      resetProcessor()

      const processed: string[] = []
      for (const filePath of cssFiles) {
        const content = await ctx.helper.fileCache.read(filePath)
        const withConfig = withTailwindConfig(content, tailwindConfigPath)
        try {
          const result = await processCSS(withConfig, filePath)
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
    //
    // Skip blökkli's own runtime/ and modules/ dirs — those utilities are
    // already baked into the precompiled output.css. Those paths only end
    // up in contentPaths when the editor is consumed against its own source
    // (e.g. the playground); they're registered there so the SFC mangle
    // Vite plugin processes them, not so we re-emit utilities for them.
    const editorOwnRuntime = ctx.helper.resolvers.module.resolve('./runtime')
    const editorOwnModules = ctx.helper.resolvers.module.resolve('./modules')
    const contentPaths = ctx
      .getContentPaths()
      .filter(
        (p) =>
          !p.startsWith(editorOwnRuntime) && !p.startsWith(editorOwnModules),
      )
    if (contentPaths.length > 0) {
      try {
        const utilities = await processCSS(
          `@layer theme, base, components, utilities;
@import 'tailwindcss/theme.css' layer(theme);
@import 'tailwindcss/utilities.css' layer(utilities);
@config '${tailwindConfigPath}';`,
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
