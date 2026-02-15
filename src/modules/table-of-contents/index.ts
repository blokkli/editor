import { addComponent, createResolver } from '@nuxt/kit'
import { defineBlokkliModule } from '../defineBlokkliModule'
import { fileURLToPath } from 'node:url'

export default defineBlokkliModule({
  setup(ctx) {
    const moduleResolver = createResolver(
      fileURLToPath(new URL('./', import.meta.url)),
    )
    ctx.helper.addAlias(
      '#blokkli/table-of-contents',
      moduleResolver.resolve('./runtime/types'),
    )
    addComponent({
      filePath: moduleResolver.resolve(
        './runtime/components/BlokkliTableOfContents/index.vue',
      ),
      name: 'BlokkliTableOfContents',
      global: true,
    })
  },
})
