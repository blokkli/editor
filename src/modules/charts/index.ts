import { createResolver } from '@nuxt/kit'
import { defineBlokkliModule } from '../defineBlokkliModule'
import { fileURLToPath } from 'node:url'
import * as path from 'node:path'
import { ChartTypeCollector } from './build/ChartTypeCollector'
import createDefinitionsTemplate from './build/templates/definitions'
import createComponentsTemplate from './build/templates/components'
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

    const nuxt = helper.nuxt
    const moduleBlokkliDirs = helper.options.blokkliDirs || []

    const projectChartsDir = path.resolve(
      nuxt.options.rootDir,
      'blokkli/chart-types',
    )

    // The charts module's own built-in types (bar, pie) live at
    // ./runtime/blokkli/chart-types/, picked up via the blokkliDirs loop
    // below — this module consumes the same convention it offers to userland.
    const chartTypes = new ChartTypeCollector(helper, {
      dirs: [
        projectChartsDir,
        ...moduleBlokkliDirs.map((d) => path.join(d, 'chart-types')),
      ],
    })
    context.addCollector(chartTypes)
    context.addTemplate(createDefinitionsTemplate(chartTypes))
    context.addTemplate(createComponentsTemplate(chartTypes))

    helper.addAppTsInclude(projectChartsDir)
    for (const dir of moduleBlokkliDirs) {
      helper.addAppTsInclude(path.join(dir, 'chart-types'))
    }

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
