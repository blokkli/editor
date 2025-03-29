import { toValidVariableName } from './../../../helpers'
import { defineCodeTemplate } from '../defineTemplate'
import { toImports, toObject } from '../helpers'

export default defineCodeTemplate(
  'features',
  (ctx) => {
    const features = ctx.features
      .getEnabledFeatures()
      .sort((a, b) => b.id.localeCompare(a.id))

    const featuresComponents = new Map<string, string>()
    const definitions: string[] = []
    const declarations: string[] = []
    const imports = new Map<string, string>()

    for (const feature of features) {
      const componentVarName = toValidVariableName(`component_${feature.id}`)
      const declarationVarName = toValidVariableName(`feature_${feature.id}`)
      declarations.push(
        `const ${declarationVarName} = ${feature.definitionSource}`,
      )
      definitions.push(declarationVarName)
      imports.set(componentVarName, feature.componentPath)
      featuresComponents.set(feature.id, componentVarName)
    }

    const availableFeaturesAtBuild = features.map((v) => v.id)

    return `${toImports(imports)}

export const availableFeaturesAtBuild = ${JSON.stringify(
      availableFeaturesAtBuild.sort(),
    )}

${toObject('featureComponents', featuresComponents)}

${declarations.join('\n\n')}

export const featureDefinitions = [
  ${definitions.join(',\n  ')}
]
`
  },
  (ctx) => {
    const features = ctx.features.getEnabledFeatures().map((v) => v.id)

    const availableFeaturesAtBuild = features

    return `
import type { BlokkliAdapter } from '${ctx.helper.relativePaths.ADAPTER}'
import type { Viewport } from '${ctx.helper.relativePaths.CONSTANTS}'
import type { Component } from 'vue'

type AdapterMethods = keyof BlokkliAdapter<any>

export type ValidFeatureKey = ${availableFeaturesAtBuild.map((v) => '"' + v + '"').join(' | ')}

export declare const featureComponents: Record<ValidFeatureKey, Component>
export declare const featureDefinitions: FeatureDefinition[]
export declare const availableFeaturesAtBuild: ValidFeatureKey[]
`
  },
  {
    dependencies: ['features'],
  },
)
