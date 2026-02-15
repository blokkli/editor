import { addComponent, createResolver } from '@nuxt/kit'
import { defineBlokkliModule } from '../defineBlokkliModule'
import { fileURLToPath } from 'node:url'

export default defineBlokkliModule({
  alterOptions: (options) => {
    const moduleResolver = createResolver(
      fileURLToPath(new URL('./', import.meta.url)),
    )
    const featurePath = moduleResolver.resolve(
      './runtime/features/charts/index.vue',
    )
    options.featureImports ||= []
    options.featureImports.push(featurePath)
  },
  setup(ctx) {
    // const moduleResolver = createResolver(
    //   fileURLToPath(new URL('./', import.meta.url)),
    // )
    // ctx.helper.addAlias(
    //   '#blokkli/charts',
    //   moduleResolver.resolve('./runtime/types'),
    // )
    // addComponent({
    //   filePath: moduleResolver.resolve(
    //     './runtime/components/BlokkliTableOfContents/index.vue',
    //   ),
    //   name: 'BlokkliTableOfContents',
    //   global: true,
    // })
  },
})
