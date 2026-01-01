import { defineCodeTemplate } from '../defineTemplate'
import { type CollectedBlockFile, isBlock } from '../../Collector/Blocks'
import { relative } from 'pathe'
import type { GetBundlePropsTypeResult } from '../../types'
import type {
  BlockDefinitionInputBase,
  BlockDefinitionOptionsInputBase,
} from './../../../shared/types/definitions'

function toStringUnion(strings: string[]): string {
  return (
    strings
      .sort()
      .map((v) => `'${v}'`)
      .join(' | ') || 'never'
  )
}

function getOptionTypes(
  definition: BlockDefinitionInputBase,
  globalOptions: BlockDefinitionOptionsInputBase,
) {
  const definedOptions = { ...(definition.options || {}) }

  // Add global options used.
  const blockGlobalOptions: string[] = definition.globalOptions || []
  blockGlobalOptions.forEach((key) => {
    if (globalOptions[key]) {
      definedOptions[key] = globalOptions[key]
    }
  })

  const options = Object.entries(definedOptions || {})
    .map(([key, option]) => {
      if (option.type === 'checkbox') {
        return `${key}: '1' | '0' | undefined`
      } else if (
        option.type === 'text' ||
        option.type === 'radios' ||
        option.type === 'checkboxes' ||
        option.type === 'color' ||
        option.type === 'datetime-local'
      ) {
        return `${key}: string | undefined`
      } else if (option.type === 'range' || option.type === 'number') {
        return `${key}: number | string | undefined`
      }
    })
    .join('\n    ')

  return `{
    ${options}
  }`
}

export default defineCodeTemplate(
  'generated-types',
  () => {
    return `export {}`
  },
  (ctx) => {
    const fromLibraryBlockBundle = ctx.helper.options.fromLibraryBlockBundle
    const fragmentBlockBundle = ctx.helper.options.fragmentBlockBundle
    const mappedGetBundlePropsType = (
      bundle: string,
      file: CollectedBlockFile,
    ): GetBundlePropsTypeResult | null => {
      if (bundle === fromLibraryBlockBundle || bundle === fragmentBlockBundle) {
        return {
          typeName: 'Props',
          from: file.filePath,
        }
      } else if (ctx.helper.options.getBundlePropsType) {
        return ctx.helper.options.getBundlePropsType(bundle, file)
      }

      return null
    }

    const chunkNames = ctx.helper.options.chunkNames || ['global']
    const fieldListTypes = ctx.helper.options.fieldListTypes || ['default']
    const globalOptions = ctx.helper.options.globalOptions || {}

    const validGlobalOptions = Object.keys(globalOptions)

    const blockBundlesWithNested: string[] = []
    const validBlockBundles: string[] = []
    const propTypeImports: Record<
      string,
      { bundle: string; typeName: string }[]
    > = {}
    const propTypes: Record<string, string> = {}
    const typedFieldListItems: { typeName: string; typeDefinition: string }[] =
      []

    for (const file of ctx.blocks.files.values()) {
      if (!file.definition || !isBlock(file.definition)) {
        continue
      }
      if (file.hasBlokkliField) {
        blockBundlesWithNested.push(file.definition.bundle)
      }

      if (
        file.definition.bundle !== ctx.helper.options.fromLibraryBlockBundle &&
        !validBlockBundles.includes(file.definition.bundle)
      ) {
        validBlockBundles.push(file.definition.bundle)
      }

      // Skip components renderFor components, because we only want to generate
      // option and prop types for the "main" component.
      if (!file.definition.renderFor) {
        const bundle = file.definition.bundle
        const options = getOptionTypes(file.definition, globalOptions)
        const generatedTypeName = `FieldListItem_${bundle}`
        const lines: string[] = [`  bundle: '${bundle}'`, `options: ${options}`]
        const bundlePropsType = mappedGetBundlePropsType(bundle, file)
        if (bundlePropsType) {
          const { typeName, from } = bundlePropsType

          if (!propTypeImports[from]) {
            propTypeImports[from] = []
          }

          propTypeImports[from].push({ bundle, typeName })

          const tsTypeName = `Bundle_${bundle}_Props`
          lines.push(`props: ${tsTypeName}`)
          propTypes[bundle] = tsTypeName
        }

        const typeDefinition = `
type ${generatedTypeName} = {
${lines.join('\n  ')}
}`
        typedFieldListItems.push({
          typeName: generatedTypeName,
          typeDefinition,
        })
      }
    }

    const propTypeImportStatements = Object.entries(propTypeImports)
      .map(([from, items]) => {
        const imports = items
          .map((v) => {
            return `${v.typeName} as Bundle_${v.bundle}_Props`
          })
          .join(', ')
        const importPath = from.startsWith('/')
          ? relative(ctx.helper.paths.blokkliBuildDir, from)
          : from
        return `import type { ${imports} } from '${importPath}'`
      })
      .join('\n')

    const BundleProps = Object.entries(propTypes)
      .map(([key, type]) => {
        return `'${key}': ${type}`
      })
      .join('\n  ')

    return `
${propTypeImportStatements}
import type { FieldListItem } from "${ctx.helper.relativePaths.TYPES}"

export type ValidFieldListTypes = ${toStringUnion(fieldListTypes)}

export type BlockBundle = ${toStringUnion(validBlockBundles)}

export type BlockBundleWithNested = ${toStringUnion(blockBundlesWithNested)}

export type ValidChunkNames = ${toStringUnion(chunkNames)}

export type BundleProps = {
  ${BundleProps}
}

export type GlobalOptionsKey = ${toStringUnion(validGlobalOptions)}

export type ValidGlobalConfigKeys = Array<GlobalOptionsKey>

${typedFieldListItems.map((v) => v.typeDefinition).join('\n\n')}

export type FieldListItemTyped = Omit<FieldListItem, 'props'> & (${typedFieldListItems
      .map((v) => v.typeName)
      .sort()
      .join(' | ')})
export type FieldListItemTypedArray = Array<FieldListItemTyped>
`
  },
  {
    dependencies: ['block-path'],
  },
)
