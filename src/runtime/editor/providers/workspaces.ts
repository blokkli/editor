import { ref, computed, type Ref, type ComputedRef } from '#imports'
import { loadFzf, type AsyncFzf } from '#blokkli/editor/libraries/fzf'
import type {
  AdapterContext,
  FullBlokkliAdapter,
} from '#blokkli/editor/adapter'
import type { StateProvider } from './state'

export type HostEntitySearchResultLabelMap = {
  label: string
  bundles: Record<string, string>
}

export type HostEntitySearchResultItem = {
  /**
   * The ID of the host entity.
   */
  id: string

  /**
   * The UUID of the host entity.
   */
  uuid: string

  /**
   * The entity type of the host entity.
   */
  entityType: string

  /**
   * The entity bundle of the host entity.
   */
  bundle: string

  /**
   * The label of the host entity.
   */
  label: string

  /**
   * The url to start editing.
   */
  url: string

  /**
   * If an edit state exists: The time when the edit state was last changed.
   */
  lastChanged: string | null

  /**
   * If an edit state exists: The ID of the owner of the edit state.
   */
  uid: string | null

  /**
   * Optional additional context used for searching (e.g. SKU, internal ID).
   *
   * Not displayed in the UI, but included in the fzf search.
   */
  context?: string
}

export type HostEntitySearchResult = {
  items: HostEntitySearchResultItem[]

  /**
   * A map with keys that are entity types.
   */
  labelMap: HostEntitySearchResultLabelMap
}

export type WorkspacesProvider = {
  /**
   * Whether the host entities have been fetched.
   */
  isLoaded: Readonly<Ref<boolean>>

  /**
   * Whether the host entities are currently being fetched.
   */
  isLoading: Readonly<Ref<boolean>>

  /**
   * Loaded items minus the current entity, in workspace default sort order:
   * entries with edit states first → current user as owner → most-recent →
   * alphabetic by label.
   */
  defaultSorted: ComputedRef<HostEntitySearchResultItem[]>

  /**
   * Load the host entities. Idempotent — concurrent calls share the same
   * in-flight promise, and resolved data is reused on subsequent calls.
   */
  ensureLoaded: () => Promise<void>

  /**
   * Run a fuzzy search over loaded items. Resolves to fzf-ordered results
   * (excluding the current entity). An empty/whitespace query resolves to [].
   */
  search: (query: string) => Promise<HostEntitySearchResultItem[]>

  /**
   * Translated label for a bundle key, falling back to the key itself.
   */
  getBundleLabel: (bundle: string) => string
}

declare module '#blokkli/editor/adapter' {
  interface BlokkliAdapter<T> {
    /**
     * Search for host entities.
     */
    getHostEntities?: () => Promise<HostEntitySearchResult>
  }
}

export default function workspacesProvider(
  adapter: FullBlokkliAdapter<any>,
  context: ComputedRef<AdapterContext>,
  state: StateProvider,
): WorkspacesProvider {
  const items = ref<HostEntitySearchResultItem[]>([])
  const labelMap = ref<HostEntitySearchResultLabelMap | null>(null)
  const isLoaded = ref(false)
  const isLoading = ref(false)
  let loadPromise: Promise<void> | null = null
  let fzf: AsyncFzf<HostEntitySearchResultItem[]> | null = null

  function ensureLoaded(): Promise<void> {
    if (isLoaded.value) {
      return Promise.resolve()
    }
    if (loadPromise) {
      return loadPromise
    }
    isLoading.value = true
    loadPromise = adapter.getHostEntities!()
      .then((result) => {
        items.value = result.items
        labelMap.value = result.labelMap
        isLoaded.value = true
      })
      .finally(() => {
        isLoading.value = false
      })
    return loadPromise
  }

  const ownerId = computed(() => state.owner.value?.id)
  const currentEntityUuid = computed(() => context.value.entityUuid)

  const defaultSorted = computed<HostEntitySearchResultItem[]>(() => {
    return items.value
      .filter((v) => v.uuid !== currentEntityUuid.value)
      .sort((a, b) => {
        // Primary: entities with edit states first
        const aHasState = a.lastChanged !== null ? 0 : 1
        const bHasState = b.lastChanged !== null ? 0 : 1
        if (aHasState !== bHasState) return aHasState - bHasState

        // Secondary: current user is owner first
        const aIsOwner = a.uid && a.uid === ownerId.value ? 0 : 1
        const bIsOwner = b.uid && b.uid === ownerId.value ? 0 : 1
        if (aIsOwner !== bIsOwner) return aIsOwner - bIsOwner

        // Tertiary: by lastChanged (most recent first)
        if (a.lastChanged && b.lastChanged) {
          return (
            new Date(b.lastChanged).getTime() -
            new Date(a.lastChanged).getTime()
          )
        }
        if (a.lastChanged) return -1
        if (b.lastChanged) return 1

        // Quaternary: alphabetically by label
        return a.label.localeCompare(b.label)
      })
  })

  async function getFzf(): Promise<AsyncFzf<HostEntitySearchResultItem[]>> {
    if (!fzf) {
      const { AsyncFzf, asyncExtendedMatch } = await loadFzf()
      fzf = new AsyncFzf(items.value, {
        selector: (item: HostEntitySearchResultItem) =>
          item.context ? item.label + ' ' + item.context : item.label,
        match: asyncExtendedMatch,
      })
    }
    return fzf
  }

  async function search(query: string): Promise<HostEntitySearchResultItem[]> {
    const trimmed = query.trim()
    if (!trimmed) {
      return []
    }
    await ensureLoaded()
    const instance = await getFzf()
    const results = await instance.find(trimmed)
    return results
      .map((r) => r.item)
      .filter((v) => v.uuid !== currentEntityUuid.value)
  }

  function getBundleLabel(bundle: string): string {
    return labelMap.value?.bundles[bundle] ?? bundle
  }

  return {
    isLoaded,
    isLoading,
    defaultSorted,
    ensureLoaded,
    search,
    getBundleLabel,
  }
}
