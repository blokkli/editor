import { existsSync } from 'node:fs'
import { toValidVariableName } from '../../helpers'
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
    const features = ctx.features.getEnabledFeatures()
    const availableFeaturesAtBuild = features.map((v) => v.id)

    // Collect type imports for features that have a types.ts file
    const typeImports: string[] = []
    for (const feature of features) {
      const typesPath = feature.componentPath.replace('/index.vue', '/types.ts')
      if (existsSync(typesPath)) {
        typeImports.push(
          `import '${feature.componentPath.replace('/index.vue', '/types')}'`,
        )
      }
    }

    const typeImportsCode =
      typeImports.length > 0 ? '\n' + typeImports.join('\n') + '\n' : ''

    return `import type { FeatureDefinition } from '${ctx.helper.relativePaths.TYPES}'
import type { Component } from 'vue'
${typeImportsCode}
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
