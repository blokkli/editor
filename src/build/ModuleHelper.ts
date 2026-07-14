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
import { validateColorOptions } from './validation/validateColorOptions'
import type { ColorOption } from '../global/types/colorOptions'

const defaultColorOptions: Record<string, ColorOption> = {
  blue: { hex: '#3b82f6', label: 'Blue' },
  red: { hex: '#ef4444', label: 'Red' },
  green: { hex: '#10b981', label: 'Green' },
  amber: { hex: '#f59e0b', label: 'Amber' },
  purple: { hex: '#8b5cf6', label: 'Purple' },
  pink: { hex: '#ec4899', label: 'Pink' },
  teal: { hex: '#14b8a6', label: 'Teal' },
  orange: { hex: '#f97316', label: 'Orange' },
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

  /**
   * Resolver for the app directory.
   */
  app: Resolver

  /**
   * Resolver for the Nuxt app root dir.
   */
  root: Resolver
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

  /**
   * npm packages to pre-bundle via Vite's optimizeDeps, collected from the core
   * module and enabled sub-modules. Flushed by {@link applyBuildConfig}.
   */
  private packageDependencies = new Set<string>()

  /**
   * npm packages that must resolve to a single copy across the whole app.
   * Flushed to Vite's resolve.dedupe by {@link applyBuildConfig}.
   */
  private dedupedPackages = new Set<string>()

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
      root: createResolver(nuxt.options.rootDir),
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
      colorOptions: providedOptions.colorOptions || defaultColorOptions,
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

  /**
   * Path to the editor's compiled tailwind config. Used by the SFC mangle
   * pipeline and module CSS processing to inject `@config` so consumer-side
   * `@apply` resolves against the editor's theme + utilities.
   *
   * In dist (npm install): `dist/modules/tailwind/index.mjs`. In source (this
   * repo's playground): `tailwind.config.ts` at the repo root.
   */
  public getTailwindConfigPath(): string {
    const distPath = this.resolvers.module.resolve(
      './modules/tailwind/index.mjs',
    )
    if (this.fileCache.fileExists(distPath)) {
      return distPath
    }
    return this.resolvers.module.resolve('../tailwind.config.ts')
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

  /**
   * Register npm packages that the editor imports at runtime so Vite
   * pre-bundles them.
   *
   * Without this, Vite discovers a dependency lazily on first import (often via
   * a dynamic `import()`) and triggers a full page reload to re-optimize. The
   * core module declares its own dependencies; optional modules (agent, charts,
   * …) declare theirs only when enabled, so projects that don't use a module
   * don't pre-bundle its dependencies.
   *
   * Collected here and flushed to the Vite config by {@link applyBuildConfig},
   * which the core module calls once all modules have run their setup.
   *
   * @param names - Bare package specifiers (e.g. 'echarts', '@tiptap/core').
   */
  public addPackageDependency(...names: string[]) {
    for (const name of names) {
      this.packageDependencies.add(name)
    }
  }

  /**
   * Declare packages that must only ever exist once in the module graph.
   *
   * Libraries that rely on `instanceof` checks or module-level registries break
   * when a project's install tree ends up with two copies (e.g. a hoisted
   * version plus an older one nested under a transitive dependency). Forcing
   * resolution to a single copy makes the editor work regardless of how the
   * host project's package manager arranged node_modules.
   *
   * @param names - Bare package specifiers (e.g. 'prosemirror-model').
   */
  public addDedupedPackage(...names: string[]) {
    for (const name of names) {
      this.dedupedPackages.add(name)
    }
  }

  /**
   * Apply collected build configuration to the Nuxt/Vite config.
   *
   * Called once by the core module after every module's setup has run, so it
   * sees the full set of {@link addPackageDependency} and
   * {@link addDedupedPackage} registrations.
   */
  public applyBuildConfig() {
    this.nuxt.options.vite.optimizeDeps ??= {}
    const include = (this.nuxt.options.vite.optimizeDeps.include ??= [])
    const exclude = this.nuxt.options.vite.optimizeDeps.exclude ?? []
    for (const name of this.packageDependencies) {
      // Skip duplicates and anything a project has explicitly opted out of.
      if (include.includes(name) || exclude.includes(name)) {
        continue
      }
      include.push(name)
    }

    this.nuxt.options.vite.resolve ??= {}
    const dedupe = (this.nuxt.options.vite.resolve.dedupe ??= [])
    for (const name of this.dedupedPackages) {
      if (!dedupe.includes(name)) {
        dedupe.push(name)
      }
    }
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
    const rel = relative(this.nuxt.options.buildDir, absolutePath) + '/**/*'
    this.nuxt.options.typescript.tsConfig ||= {}
    this.nuxt.options.typescript.tsConfig.include ||= []
    this.nuxt.options.typescript.tsConfig.include.push(rel)
  }

  /**
   * Add a directory to the server/Nitro TypeScript tsconfig includes.
   */
  public addServerTsInclude(absolutePath: string) {
    const rel = relative(this.nuxt.options.buildDir, absolutePath) + '/**/*'
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
    let hasErrors = false

    const optionErrors = validateOptions(this.options.globalOptions, icons)
    if (optionErrors.length > 0) {
      const lines = optionErrors.map((error) => {
        const prefix = error.optionKey
          ? `  Option "${error.optionKey}": `
          : '  '
        return prefix + error.message
      })
      this.logger.error(
        `blökkli global options validation errors:\n${lines.join('\n')}`,
      )
      hasErrors = true
    }

    const colorErrors = validateColorOptions(this.options.colorOptions)
    if (colorErrors.length > 0) {
      const lines = colorErrors.map((error) => {
        const prefix = error.optionKey
          ? `  Option "${error.optionKey}": `
          : '  '
        return prefix + error.message
      })
      this.logger.error(
        `blökkli colorOptions validation errors:\n${lines.join('\n')}`,
      )
      hasErrors = true
    }

    return hasErrors
  }
}
