import type { BlockDefinitionOptionsInputBase } from '../shared/types/definitions'
import type { AdapterMethodsBase } from '../shared/types/adapter'
import type { Theme, ThemeName } from '../shared/types/theme'
import type { CollectedBlockFile } from './Collector/Blocks'
import type { BlokkliModule } from '../modules/defineBlokkliModule'

export type { AdapterMethodsBase as AdapterMethods }

export type GetBundlePropsTypeResult = {
  typeName: string
  from: string
}

export type GetBundlePropsType = (
  name: string,
  definition: CollectedBlockFile,
) => GetBundlePropsTypeResult

export type BuildRelativeImports = {
  TYPES: string
  RUNTIME_MATERIAL_ICONS: string
  CONSTANTS: string
  ADAPTER: string
  TYPES_THEME: string
  TYPES_BLOKK_OPTIONS: string
}

export type ModuleContext = {
  /**
   * The absolute path to the blokkli build directory.
   */
  blokkliBuildDir: string

  /**
   * The srcDir of the Nuxt app.
   */
  srcDir: string
}

type ModuleOptionsStorageDefaults = {
  /**
   * The default favorite block bundles.
   */
  blockFavorites?: string[]
}

/**
 * Options for the module.
 */
export type ModuleOptions = {
  /**
   * An array of blökkli modules to use.
   */
  modules?: BlokkliModule[]

  /**
   * The pattern of source files to scan for blokkli components.
   */
  pattern?: string[]

  /**
   * Define reusable options that can be used in blokkli item components by
   * referencing the option name.
   */
  globalOptions?: BlockDefinitionOptionsInputBase

  /**
   * Custom path where the blökkli edit adapter can be found.
   *
   * Must be an absolute path and the file must exist when the module
   * is initialised.
   */
  editAdapterPath?: string

  /**
   * Define available chunk groups.
   *
   * The idea of this feature is to split rarely used components into separate
   * chunks, so that they are not imported on each page.
   *
   * This value should only be set if the component is actually used rarely.
   * Having too many chunks has the opposite effect, as rendering a page
   * requires multiple requests.
   *
   * If left empty, all components are bundled in a default chunk, which should
   * contain components that are used for most pages.
   */
  chunkNames?: string[]

  /**
   * Valid field list types.
   *
   * If one or more values are defined, they can be passed to the BlokkliField
   * component as a prop. The value is made available to all blokkli items inside
   * this field.
   */
  fieldListTypes?: string[]

  /**
   * The entity type of blokkli items.
   *
   * Using the paragraphs_blokkli integration this value should be set to "paragraph".
   */
  itemEntityType?: string

  /**
   * Provide overrides for the translations.
   */
  translations?: Record<string, Record<string, string>>

  /**
   * The default/fallback language for the editor.
   */
  defaultLanguage?: string

  /**
   * Force the editor to always be in the default language.
   *
   * The default behaviour is that the editor is rendered in the same language
   * as the page entity. Setting this value to true will always render the
   * editor in the default language.
   */
  forceDefaultLanguage?: boolean

  /**
   * Add custom features by defining either a pattern or path to a feature component.
   */
  featureImports?: string[]

  /**
   * Theme colors for the editor.
   *
   * Accent colors are used for selections, highlights, buttons.
   * Mono colors are used for the UI elements in the editor.
   */
  theme?: ThemeName | Partial<Theme>

  /**
   * Enable the theme editor feature.
   */
  enableThemeEditor?: boolean

  /**
   * blokkli generates a JSON file that contains all the defined block
   * options, keyed by block bundle. By default the file is output to
   * .nuxt/blokkli/options-schema.json, but the path can be overriden here.
   *
   * The path can use aliases like ~ or @ and must also contain the file
   * name including the extension.
   */
  schemaOptionsPath?: string

  /**
   * Override the feature settings.
   */
  settingsOverride?: Record<string, { disable?: boolean; default?: any }>

  /**
   * The default storage values for non-settings values.
   *
   * These values are not visible in the settings dialog, but are still
   * "settable" by the user through interactions. This option allows you to
   * define default values for these settings, like default favorite block
   * bundles.
   */
  storageDefaults?: ModuleOptionsStorageDefaults

  /**
   * Method that is called for each block bundle component to generate the
   * prop types.
   *
   * These types are used if you access a block item with the generated
   * FieldListItemTyped type, for example through:
   * const { rootBlocks } = defineBlokkli().
   *
   * or using <BlokkliField v-slot="{ items }">.
   *
   * The method receives the name of the bundle and the extracted block
   * definition as the second argument.
   * The return value should be an object with these properties:
   *
   * - typeName: The name of the type
   * - from: Where the type can be imported from
   *
   * For example, if the method returns this object:
   * ```typescript
   * {
   *   typeName: 'ParagraphTextWithImageFragment',
   *   from: '#graphql-operations'
   * }
   * ```
   *
   * Then the module will generate this TypeScript code:
   *
   * ```typescript
   * import type { ParagraphTextWithImageFragment } from '#graphql-operations'
   * ```
   *
   * And assign the imported type as the type for the `props` property for this bundle.
   *
   * Then, for example in a block component:
   *
   * ```typescript
   * const { siblings, index } = defineBlokkli()
   *
   * const previousBlock = computed(() => siblings.value[index.value - 1])
   *
   * const previousTitle = computed(() => {
   *   // The previous block in the list is a title.
   *   if (previousBlock.value?.bundle === 'title') {
   *     // The type of the props are now typed correctly.
   *     const title = previousBlock.value.props.title
   *   }
   * })
   * ```
   */
  getBundlePropsType?: GetBundlePropsType
}
