import { addServerHandler, createResolver } from '@nuxt/kit'
import { fileURLToPath } from 'node:url'
import * as path from 'node:path'
import { defineBlokkliModule } from '../defineBlokkliModule'
import { PrimitiveCollector } from './build/PrimitiveCollector'
import createPrimitivesTemplate from './build/templates/primitives'
import childrenTemplate from './build/templates/children'

export type CompositionModuleOptions = {
  /**
   * Where to write the classes compositions can render, for Tailwind's
   * `@source`. Defaults to `<rootDir>/blokkli/composition/classes.generated.txt`.
   */
  safelistPath?: string
}

const resolve = createResolver(
  fileURLToPath(new URL('./', import.meta.url)),
).resolve

export default defineBlokkliModule<CompositionModuleOptions>({
  alterOptions(options) {
    options.blokkliDirs ??= []
    options.blokkliDirs.push(resolve('./runtime/blokkli'))
  },
  setup({ context, helper, $t }, options = {}) {
    const typesPath = resolve('./runtime/types')
    helper.addAlias('#blokkli/composition/types', typesPath)
    helper.addAlias(
      '#blokkli/composition/helpers',
      resolve('./runtime/helpers'),
    )
    helper.addAlias(
      '#blokkli/composition/components',
      resolve('./runtime/components'),
    )

    const projectDir = path.resolve(
      helper.nuxt.options.rootDir,
      'blokkli/composition',
    )
    // blökkli's own primitives first: a project's primitive with the same id
    // replaces one.
    const collector = new PrimitiveCollector(helper, [
      resolve('./runtime/blokkli/composition'),
      projectDir,
    ])
    context.addCollector(collector)
    createPrimitivesTemplate(collector, {
      safelistPath:
        options.safelistPath ?? path.join(projectDir, 'classes.generated.txt'),
      typesPath: typesPath + '.ts',
    }).forEach((template) => context.addTemplate(template))
    context.addTemplate(childrenTemplate)
    helper.addAppTsInclude(projectDir)
    helper.addAlias(
      '#blokkli/composition/adapter',
      resolve('./runtime/helpers/adapterTypes'),
    )
    helper.addAlias(
      '#blokkli/composition/child',
      resolve('./runtime/composables/useCompositionChild'),
    )

    context.registerComplexOptionType({
      id: 'composition',
      typeName: 'CompositionDocument',
      typePath: typesPath,
      editorComponentPath: resolve('./runtime/editor/SourceEditor.vue'),
      editTitle: $t('compositionEditSourceTitle', 'Composition (source)'),
      editorIcon: 'bk_mdi_dashboard',
      // It places the paragraphs of its field.
      nestsBlocks: true,
    })

    // The server compiles and checks a composition's source: the browser only
    // gets what this accepted.
    addServerHandler({
      route: '/api/blokkli/composition/compile',
      method: 'post',
      handler: resolve('./runtime/server/api/compile'),
    })
  },
})
