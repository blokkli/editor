import { defineCodeTemplate } from '../defineTemplate'
import { relative } from 'pathe'
import { toValidVariableName } from './../../../helpers'

export default defineCodeTemplate(
  'features',
  (ctx) => {
    const features = ctx.features.getFeatures().map((v) => {
      const importName = `Feature_${toValidVariableName(v.id)}`
      return {
        id: v.id,
        componentName: v.componentPath,
        importName,
        importStatement: `import ${importName} from '${relative(ctx.helper.paths.blokkliBuildDir, v.componentPath)}'`,
        definition: v.definition,
      }
    })

    const imports = features.map((v) => v.importStatement).join('\n')

    const availableFeaturesAtBuild = features.map((v) => v.id)

    const featuresArray = features
      .map((v) => {
        return `{
  id: "${v.id}",
  dependencies: ${JSON.stringify(v.definition.dependencies || [])},
  viewports: ${JSON.stringify(v.definition.viewports || [])},
  component: ${v.importName},
  requiredAdapterMethods: ${JSON.stringify(
    v.definition.requiredAdapterMethods || [],
  )},
  label: ${JSON.stringify(v.definition.label || '')},
  beta: ${JSON.stringify(!!v.definition.beta)},
  icon: ${JSON.stringify(v.definition.icon)},
  description: "${v.definition.description || ''}"
}`
      })
      .join(',\n')

    return `${imports}
export const availableFeaturesAtBuild = ${JSON.stringify(
      availableFeaturesAtBuild,
    )}

export const featureComponents = [
${featuresArray}
]
`
  },
  (ctx) => {
    const features = ctx.features.getFeatures().map((v) => v.id)

    const availableFeaturesAtBuild = features

    return `
import type { BlokkliAdapter } from '${ctx.helper.relativePaths.ADAPTER}'
import type { Viewport } from '${ctx.helper.relativePaths.CONSTANTS}'

type AdapterMethods = keyof BlokkliAdapter<any>

export type ValidFeatureKey = ${availableFeaturesAtBuild.map((v) => '"' + v + '"').join(' | ')}

export type FeatureComponent = {
  id: ValidFeatureKey
  component: any
  requiredAdapterMethods: AdapterMethods[]
  dependencies: ValidFeatureKey[]
  description: string
  label: string
  beta: boolean
  icon: string
  viewports: Viewport[]
}

export declare const featureComponents: FeatureComponent[]
export declare const availableFeaturesAtBuild: ValidFeatureKey[]
`
  },
  {
    dependencies: ['features'],
  },
)
