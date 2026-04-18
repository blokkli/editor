import type { Nuxt } from 'nuxt/schema'
import type { ConsolaInstance } from 'consola'
import type { BuildRelativeImports, ModuleOptions } from './types'
import { relative } from 'pathe'
import {
  type Resolver,
  addComponent,
  addImports,
  createResolver,
} from '@nuxt/kit'
import { FileCache } from './FileCache'
import { onlyUnique } from './helpers'
import type { ValidationInterface } from './ValidationInterface'
import type { IconCollector } from './Collector/Icons'
import { validateOptions } from './validation/validateOptions'

type ModuleHelperResolvers = {
  /**
   * Resolver for files relative to the module src.
   */
  module: Resolver

  /**
   * Resolver for files relative to the blökkli build directory.
   */
  build: Resolver

  /**
   * Resolver for files relative to the Nuxt app source directory.
   */
  src: Resolver

  /**
   * Resolver for the app directory.
   */
  app: Resolver
}

type ModuleHelperPaths = {
  blokkliBuildDir: string
  srcDir: string
  editAdapter: string
}

export class ModuleHelper implements ValidationInterface {
  relativePaths: BuildRelativeImports
  paths: ModuleHelperPaths
  resolvers: ModuleHelperResolvers
  public fileCache: FileCache
  public readonly options: ModuleOptions

  public readonly isDev: boolean
  public readonly isModuleBuild: boolean
  public readonly isPrepare: boolean

  constructor(
    public nuxt: Nuxt,
    public logger: ConsolaInstance,
    moduleUrl: string,
    providedOptions: ModuleOptions,
  ) {
    this.isDev = nuxt.options.dev
    this.isPrepare = !!nuxt.options._prepare
    this.isModuleBuild = process.env.PLAYGROUND_MODULE_BUILD === 'true'

    this.fileCache = new FileCache()
    this.resolvers = {
      module: createResolver(moduleUrl),
      build: createResolver(nuxt.options.buildDir),
      src: createResolver(nuxt.options.srcDir),
      app: createResolver(nuxt.options.dir.app),
    }
    this.paths = {
      blokkliBuildDir: this.resolvers.build.resolve('blokkli'),
      srcDir: nuxt.options.srcDir,
      editAdapter: '',
    }

    this.relativePaths = {
      TYPES: relative(
        this.paths.blokkliBuildDir,
        this.resolvers.module.resolve('./runtime/types/index.ts'),
      ),
      TYPES_DEFINITIONS: relative(
        this.paths.blokkliBuildDir,
        this.resolvers.module.resolve('./runtime/types/definitions.ts'),
      ),
      CONSTANTS: relative(
        this.paths.blokkliBuildDir,
        this.resolvers.module.resolve('./runtime/constants/index.ts'),
      ),
      ADAPTER: relative(
        this.paths.blokkliBuildDir,
        this.resolvers.module.resolve('./runtime/editor/adapter/index.ts'),
      ),
      TYPES_THEME: relative(
        this.paths.blokkliBuildDir,
        this.resolvers.module.resolve('./runtime/types/theme.ts'),
      ),
      TYPES_BLOKK_OPTIONS: relative(
        this.paths.blokkliBuildDir,
        this.resolvers.module.resolve('./runtime/types/blockOptions.ts'),
      ),
    }

    const pattern: string[] = providedOptions.pattern || []
    pattern.push(
      this.resolvers.module.resolve(
        './runtime/components/Blocks/FromLibrary/*.vue',
      ),
    )
    pattern.push(
      this.resolvers.module.resolve(
        './runtime/components/Blocks/Fragment/*.vue',
      ),
    )

    if (this.isModuleBuild) {
      pattern.push(
        this.resolvers.module.resolve(
          './../playground/app/components/Blokkli/**/*.vue',
        ),
      )
    }

    const fieldListTypes: string[] = providedOptions.fieldListTypes || []
    if (!fieldListTypes.includes('default')) {
      fieldListTypes.push('default')
    }

    const providerTypes: string[] = providedOptions.providerTypes || []
    if (!providerTypes.includes('default')) {
      providerTypes.push('default')
    }

    const chunkNames: string[] = providedOptions.chunkNames || []

    if (!chunkNames.includes('global')) {
      chunkNames.push('global')
    }

    this.options = {
      ...providedOptions,
      pattern,
      fieldListTypes: fieldListTypes.filter(onlyUnique),
      providerTypes: providerTypes.filter(onlyUnique),
      chunkNames: chunkNames.filter(onlyUnique),
    }

    this.paths.editAdapter = this.findEditAdapterPath()
  }

  /**
   * Transform the path relative to the module's build directory.
   *
   * @param path - The absolute path.
   *
   * @returns The path relative to the module's build directory.
   */
  public toModuleBuildRelative(path: string): string {
    return relative(this.paths.blokkliBuildDir, path)
  }

  private findEditAdapterPath(): string {
    const filePath = this.resolvers.app.resolve('blokkli.editAdapter.ts')

    if (this.fileCache.fileExists(filePath)) {
      return filePath
    }

    if (
      this.options.editAdapterPath &&
      this.fileCache.fileExists(this.options.editAdapterPath)
    ) {
      return this.options.editAdapterPath
    }

    throw new Error(`Missing blökkli edit adapter at "${filePath}"`)
  }

  public getChunkNames(): string[] {
    return this.options.chunkNames || ['global']
  }

  public addComponent(name: string) {
    addComponent({
      filePath: this.resolvers.module.resolve('./runtime/components/' + name),
      name,
      global: true,
    })
  }

  public addComposable(name: string) {
    addImports({
      name,
      from: this.resolvers.module.resolve('./runtime/composables/' + name),
    })
  }

  public addAlias(name: string, path: string) {
    this.nuxt.options.alias[name] = path

    this.nuxt.options.nitro.typescript ||= {}
    this.nuxt.options.nitro.typescript.tsConfig ||= {}
    this.nuxt.options.nitro.typescript.tsConfig.compilerOptions ||= {}
    this.nuxt.options.nitro.typescript.tsConfig.compilerOptions.paths ||= {}
    this.nuxt.options.nitro.typescript.tsConfig.compilerOptions.paths[name] = [
      path,
    ]
    this.nuxt.options.nitro.typescript.tsConfig.compilerOptions.paths[
      name + '/*'
    ] = [path + '/*']

    this.nuxt.options.typescript.tsConfig ||= {}
    this.nuxt.options.typescript.tsConfig.compilerOptions ||= {}
    this.nuxt.options.typescript.tsConfig.compilerOptions.paths ||= {}
    this.nuxt.options.typescript.tsConfig.compilerOptions.paths[name] = [path]
    this.nuxt.options.typescript.tsConfig.compilerOptions.paths[name + '/*'] = [
      path + '/*',
    ]
  }

  /**
   * Add a directory to the app TypeScript tsconfig includes.
   */
  public addAppTsInclude(absolutePath: string) {
    const rel = relative(this.nuxt.options.buildDir, absolutePath)
    this.nuxt.options.typescript.tsConfig ||= {}
    this.nuxt.options.typescript.tsConfig.include ||= []
    this.nuxt.options.typescript.tsConfig.include.push(rel)
  }

  /**
   * Add a directory to the server/Nitro TypeScript tsconfig includes.
   */
  public addServerTsInclude(absolutePath: string) {
    const rel = relative(this.nuxt.options.buildDir, absolutePath)
    this.nuxt.options.nitro.typescript ||= {}
    this.nuxt.options.nitro.typescript.tsConfig ||= {}
    this.nuxt.options.nitro.typescript.tsConfig.include ||= []
    this.nuxt.options.nitro.typescript.tsConfig.include.push(rel)
  }

  /**
   * Add a path to Nitro's externals.inline for server-side usage.
   * @see https://github.com/nuxt/nuxt/issues/28995
   */
  public inlineForNitro(path: string) {
    this.nuxt.options.nitro.externals ||= {}
    this.nuxt.options.nitro.externals.inline ||= []
    this.nuxt.options.nitro.externals.inline.push(path)
    this.nuxt.options.build.transpile.push(path)
  }

  public getMappedBlockBundle(bundle: string): string {
    if (bundle === 'BK_BUNDLE_FROM_LIBRARY') {
      return this.options.fromLibraryBlockBundle ?? 'from_library'
    } else if (bundle === 'BK_BUNDLE_FRAGMENT') {
      return this.options.fragmentBlockBundle ?? 'blokkli_fragment'
    }

    return bundle
  }

  public validate(icons: IconCollector): boolean {
    const errors = validateOptions(this.options.globalOptions, icons)

    if (errors.length > 0) {
      const lines = errors.map((error) => {
        const prefix = error.optionKey
          ? `  Option "${error.optionKey}": `
          : '  '
        return prefix + error.message
      })
      this.logger.error(
        `blökkli global options validation errors:\n${lines.join('\n')}`,
      )
      return true
    }

    return false
  }
}
