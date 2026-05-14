import { createResolver } from '@nuxt/kit'
import { defineBlokkliModule } from '../defineBlokkliModule'
import { fileURLToPath } from 'node:url'
import type { ChartsModuleOptions } from './build/types'

const resolve = createResolver(
  fileURLToPath(new URL('./', import.meta.url)),
).resolve

export default defineBlokkliModule<ChartsModuleOptions>({
  alterOptions(options) {
    options.blokkliDirs ??= []
    options.blokkliDirs.push(resolve('./runtime/blokkli'))
  },
  setup({ context, helper, $t }) {
    helper.addAlias('#blokkli/charts/types', resolve('./runtime/types'))
    helper.addAlias(
      '#blokkli/charts/adapter',
      resolve('./runtime/helpers/adapterTypes'),
    )
    helper.addAlias(
      '#blokkli/charts/components',
      resolve('./runtime/components'),
    )

    context.registerComplexOptionType({
      id: 'chart',
      typeName: 'BlokkliChartData',
      typePath: resolve('./runtime/types'),
      editorComponentPath: resolve(
        './runtime/features/charts/Editor/index.vue',
      ),
      editTitle: $t('chartsEditTitle', 'Edit chart'),
      editorIcon: 'bk_mdi_area_chart',
    })
  },
})
