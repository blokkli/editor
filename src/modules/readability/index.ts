import { createResolver } from '@nuxt/kit'
import { defineBlokkliModule } from '../defineBlokkliModule'
import { fileURLToPath } from 'node:url'

const resolve = createResolver(
  fileURLToPath(new URL('./', import.meta.url)),
).resolve

export default defineBlokkliModule({
  setup({ context, helper }) {
    // English syllable counting (readability scores) imports `syllable` lazily.
    // Registered here so it is only pre-bundled when this module is enabled.
    helper.addPackageDependency('syllable')

    context.registerAdapterExtension(
      '@blokkli/readability',
      resolve('./runtime/adapter-extension'),
    )
  },
})
