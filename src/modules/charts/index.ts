import { createResolver } from '@nuxt/kit'
import { defineBlokkliModule } from '../defineBlokkliModule'
import { fileURLToPath } from 'node:url'
import chartsConfigTemplate from './build/templates/charts'
import type { ChartsModuleOptions } from './build/types'

export default defineBlokkliModule<ChartsModuleOptions>({
  setup(ctx, options) {
    const resolve = createResolver(
      fileURLToPath(new URL('./', import.meta.url)),
    ).resolve

    ctx.context.blocks.addFile(
      resolve('./runtime/components/Fragment/BlokkliChart.vue'),
    )
    ctx.context.features.addFile(resolve('./runtime/features/charts/index.vue'))
    ctx.context.addFeatureFragment('blokkli_chart')

    ctx.context.addTemplate(chartsConfigTemplate(options))

    ctx.helper.addAlias('#blokkli/charts/types', resolve('./runtime/types'))
  },
})
