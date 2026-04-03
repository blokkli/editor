import { createResolver } from '@nuxt/kit'
import { defineBlokkliModule } from '../defineBlokkliModule'
import { fileURLToPath } from 'node:url'
import iframesConfigTemplate from './build/templates/iframes'
import type { IframesModuleOptions } from './build/types'

const resolve = createResolver(
  fileURLToPath(new URL('./', import.meta.url)),
).resolve

export default defineBlokkliModule<IframesModuleOptions>({
  setup({ context, helper, $t }, options) {
    context.addTemplate(iframesConfigTemplate(options))

    helper.addAlias('#blokkli/iframes/types', resolve('./runtime/types'))
    helper.addAlias(
      '#blokkli/iframes/components',
      resolve('./runtime/components'),
    )

    context.registerComplexOptionType({
      id: 'iframe_heights',
      typeName: 'IframeHeightMap',
      typePath: resolve('./runtime/types'),
      editorComponentPath: resolve(
        './runtime/features/iframes/Editor/index.vue',
      ),
      editTitle: $t('iframesEditTitle', 'Edit iframe size'),
      editorIcon: 'bk_mdi_fit_screen',
    })
  },
})
