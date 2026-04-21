import { createResolver } from '@nuxt/kit'
import { defineBlokkliModule } from '../defineBlokkliModule'
import { fileURLToPath } from 'node:url'

const resolve = createResolver(
  fileURLToPath(new URL('./', import.meta.url)),
).resolve

export default defineBlokkliModule({
  setup({ context }) {
    context.registerAdapterExtension(
      '@blokkli/readability',
      resolve('./runtime/adapter-extension'),
    )
  },
})
