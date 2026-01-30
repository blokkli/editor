import { defineBlokkliModule } from '../../../../../src/modules/defineBlokkliModule'
import { createResolver } from '@nuxt/kit'
import { fileURLToPath } from 'node:url'

export default defineBlokkliModule({
  setup({ context }) {
    const resolver = createResolver(
      fileURLToPath(new URL('./', import.meta.url)),
    )
    context.registerAdapterExtension(
      '@blokkli/ai-rewrite',
      resolver.resolve('./extension.ts'),
    )
  },
})
