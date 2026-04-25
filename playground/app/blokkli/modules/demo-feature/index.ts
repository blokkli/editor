import { defineBlokkliModule } from '@blokkli/editor/modules'
import { createResolver } from '@nuxt/kit'
import { fileURLToPath } from 'node:url'

const resolver = createResolver(fileURLToPath(new URL('./', import.meta.url)))

export default defineBlokkliModule({
  alterOptions(options) {
    options.featureImports ||= []
    options.featureImports.push(resolver.resolve('./DemoFeature.vue'))
  },
  setup({ context }) {
    context.addCSS(resolver.resolve('./style.css'))
    context.addContentPath(resolver.resolve('./'))
  },
})
