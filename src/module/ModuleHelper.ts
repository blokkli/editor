import type { Nuxt } from 'nuxt/schema'
import type { BuildRelativeImports, ModuleOptions } from './types'
import { relative } from 'pathe'
import { type Resolver, createResolver } from '@nuxt/kit'
import { FileCache } from './FileCache'

type ModulePaths = {}

type ModuleHelperResolvers = {
  /**
   * Resolver for files relative to the module src.
   */
  module: Resolver

  /**
   * Resolver for files relative to the blökkli build directory.
   */
  build: Resolver
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

  constructor(
    public nuxt: Nuxt,
    moduleUrl: string,
    public readonly options: ModuleOptions,
  ) {
    this.fileCache = new FileCache()
    this.resolvers = {
      module: createResolver(moduleUrl),
      build: createResolver(nuxt.options.buildDir),
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
      TYPES_GENERATED_MODULE_TYPED: relative(
        this.paths.blokkliBuildDir,
        this.resolvers.module.resolve(
          './runtime/types/generatedModuleTypes.ts',
        ),
      ),
      TYPES_BLOKK_OPTIONS: relative(
        this.paths.blokkliBuildDir,
        this.resolvers.module.resolve('./runtime/types/blokkOptions.ts'),
      ),
    }
  }
}
