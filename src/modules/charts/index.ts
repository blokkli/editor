import { createResolver } from '@nuxt/kit'
import { defineBlokkliModule } from '../defineBlokkliModule'
import { fileURLToPath } from 'node:url'

export default defineBlokkliModule({
  setup(ctx) {
    const resolve = createResolver(
      fileURLToPath(new URL('./', import.meta.url)),
    ).resolve

    ctx.context.blocks.addFile(
      resolve('./runtime/components/Fragment/BlokkliChart.vue'),
    )
    ctx.context.features.addFile(resolve('./runtime/features/charts/index.vue'))
    ctx.context.addFeatureFragment('blokkli_chart')
  },
})
