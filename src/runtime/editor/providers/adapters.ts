import type { ComputedRef } from 'vue'
import type {
  FullBlokkliAdapter,
  BlokkliAdapterExtension,
  AdapterExtensionMethods,
  AdapterContext,
  BlokkliAdapterExtensionFactory,
} from '#blokkli/editor/adapter'

const NAMESPACE_SEPARATOR = ':'

type AnyFunction = (...args: any[]) => any

export type AdapterExtensionDefinition = {
  namespace: string
  factory: BlokkliAdapterExtensionFactory<any>
}

export interface AdaptersProvider {
  /**
   * The base adapter.
   */
  adapter: FullBlokkliAdapter<any>

  /**
   * All registered extensions.
   */
  extensions: BlokkliAdapterExtension<any>[]

  /**
   * Get aggregated results from base adapter + all extensions.
   * Results from extensions have their IDs prefixed with namespace.
   */
  getAggregated<K extends keyof AdapterExtensionMethods<any>>(
    methodName: K,
  ): Promise<any[]>

  /**
   * Call a method, routing to the correct source based on namespace in pluginId.
   * If pluginId has namespace prefix, calls extension; otherwise calls base adapter.
   */
  callNamespaced<K extends keyof AdapterExtensionMethods<any>>(
    methodName: K,
    args: { pluginId: string } & Record<string, any>,
  ): Promise<any>

  /**
   * Get extension by namespace.
   */
  getExtension(namespace: string): BlokkliAdapterExtension<any> | undefined
}

export default async function adaptersProvider(
  adapter: FullBlokkliAdapter<any>,
  extensionDefinitions: AdapterExtensionDefinition[],
  context: ComputedRef<AdapterContext>,
): Promise<AdaptersProvider> {
  // Initialize all extensions
  const extensions: BlokkliAdapterExtension<any>[] = await Promise.all(
    extensionDefinitions.map(async (def) => ({
      namespace: def.namespace,
      methods: await Promise.resolve(def.factory(context)),
    })),
  )
  // Map for fast namespace lookup
  const extensionsByNamespace = new Map<string, BlokkliAdapterExtension<any>>()
  for (const ext of extensions) {
    extensionsByNamespace.set(ext.namespace, ext)
  }

  function prefixId(namespace: string, id: string): string {
    return `${namespace}${NAMESPACE_SEPARATOR}${id}`
  }

  function parseNamespace(id: string): [string | null, string] {
    const sepIndex = id.indexOf(NAMESPACE_SEPARATOR)
    if (sepIndex > 0 && id.startsWith('@')) {
      return [id.substring(0, sepIndex), id.substring(sepIndex + 1)]
    }
    return [null, id]
  }

  function normalizeToArray(result: any): any[] {
    if (Array.isArray(result)) {
      return result
    }
    if (result !== undefined && result !== null) {
      return [result]
    }
    return []
  }

  async function getAggregated<K extends keyof AdapterExtensionMethods<any>>(
    methodName: K,
  ): Promise<any[]> {
    const results: any[] = []

    // Base adapter first
    const baseMethod = adapter[methodName as keyof FullBlokkliAdapter<any>]
    if (typeof baseMethod === 'function') {
      const baseResults = await (baseMethod as AnyFunction).call(adapter)
      results.push(...normalizeToArray(baseResults))
    }

    // Extensions with namespaced IDs
    for (const ext of extensions) {
      const extMethod = ext.methods[methodName]
      if (typeof extMethod === 'function') {
        const extResults = await (extMethod as AnyFunction)()
        results.push(
          ...normalizeToArray(extResults).map((item: any) => {
            if (item && typeof item === 'object' && 'id' in item) {
              return { ...item, id: prefixId(ext.namespace, item.id) }
            }
            return item
          }),
        )
      }
    }

    return results
  }

  async function callNamespaced<K extends keyof AdapterExtensionMethods<any>>(
    methodName: K,
    args: { pluginId: string } & Record<string, any>,
  ): Promise<any> {
    const [namespace, localId] = parseNamespace(args.pluginId)

    if (namespace) {
      // Route to extension
      const ext = extensionsByNamespace.get(namespace)
      if (!ext) {
        throw new Error(`No adapter extension found for namespace: ${namespace}`)
      }
      const method = ext.methods[methodName]
      if (typeof method !== 'function') {
        throw new Error(
          `Extension ${namespace} does not implement ${String(methodName)}`,
        )
      }
      return (method as AnyFunction)({ ...args, pluginId: localId })
    }

    // No namespace -> base adapter
    const baseMethod = adapter[methodName as keyof FullBlokkliAdapter<any>]
    if (typeof baseMethod !== 'function') {
      throw new Error(`Base adapter does not implement ${String(methodName)}`)
    }
    return (baseMethod as AnyFunction).call(adapter, args)
  }

  function getExtension(
    namespace: string,
  ): BlokkliAdapterExtension<any> | undefined {
    return extensionsByNamespace.get(namespace)
  }

  return {
    adapter,
    extensions,
    getAggregated,
    callNamespaced,
    getExtension,
  }
}
