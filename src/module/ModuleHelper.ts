import type { Nuxt } from 'nuxt/schema'
import type { BuildRelativeImports, ModuleOptions } from './types'
import { relative } from 'pathe'
import {
  type Resolver,
  addComponent,
  addImports,
  createResolver,
} from '@nuxt/kit'
import { FileCache } from './FileCache'

function onlyUnique(value: string, index: number, self: Array<string>) {
  return self.indexOf(value) === index
}

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
}

type ModuleHelperPaths = {
  blokkliBuildDir: string
  srcDir: string
}

export class ModuleHelper {
  relativePaths: BuildRelativeImports
  paths: ModuleHelperPaths
  resolvers: ModuleHelperResolvers
  public fileCache: FileCache
  public readonly options: ModuleOptions
  public readonly isDev: boolean

  constructor(
    public nuxt: Nuxt,
    moduleUrl: string,
    providedOptions: ModuleOptions,
  ) {
    this.isDev = nuxt.options.dev
    this.fileCache = new FileCache()
    this.resolvers = {
      module: createResolver(moduleUrl),
      build: createResolver(nuxt.options.buildDir),
      src: createResolver(nuxt.options.srcDir),
    }
    this.paths = {
      blokkliBuildDir: this.resolvers.build.resolve('blokkli'),
      srcDir: nuxt.options.srcDir,
    }

    this.relativePaths = {
      TYPES: relative(
        this.paths.blokkliBuildDir,
        this.resolvers.module.resolve('./runtime/types/index.ts'),
      ),
      CONSTANTS: relative(
        this.paths.blokkliBuildDir,
        this.resolvers.module.resolve('./runtime/constants/index.ts'),
      ),
      ADAPTER: relative(
        this.paths.blokkliBuildDir,
        this.resolvers.module.resolve('./runtime/adapter/index.ts'),
      ),
      TYPES_THEME: relative(
        this.paths.blokkliBuildDir,
        this.resolvers.module.resolve('./runtime/types/theme.ts'),
      ),
      TYPES_BLOKK_OPTIONS: relative(
        this.paths.blokkliBuildDir,
        this.resolvers.module.resolve('./runtime/types/blokkOptions.ts'),
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

    const fieldListTypes: string[] = providedOptions.fieldListTypes || []
    if (!fieldListTypes.includes('default')) {
      fieldListTypes.push('default')
    }

    const chunkNames: string[] = providedOptions.chunkNames || []

    if (!chunkNames.includes('global')) {
      chunkNames.push('global')
    }

    this.options = {
      ...providedOptions,
      pattern,
      fieldListTypes: fieldListTypes.filter(onlyUnique),
      chunkNames: chunkNames.filter(onlyUnique),
    }
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
}
