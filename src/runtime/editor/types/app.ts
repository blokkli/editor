import type { ComputedRef } from 'vue'
import type { DomProvider } from '../providers/dom'
import type {
  AdapterContext,
  FullBlokkliAdapter,
} from '#blokkli/editor/adapter'
import type { Eventbus } from '../events'
import type { StorageProvider } from '../providers/storage'
import type { BlockDefinitionProvider } from '../providers/types'
import type { SelectionProvider } from '../providers/selection'
import type { KeyboardProvider } from '../providers/keyboard'
import type { UiProvider } from '../providers/ui'
import type { AnimationProvider } from '../providers/animation'
import type { StateProvider } from '../providers/state'
import type { IconsProvider } from '../providers/icons'
import type { DirectiveProvider } from '../providers/directive'
import type { TextProvider } from '../providers/texts'
import type { PluginProvider } from '../providers/plugin'
import type { BroadcastProvider } from '../providers/broadcast'
import type { FeaturesProvider } from '../providers/features'
import type { DebugProvider } from '../providers/debug'
import type { IndicatorsProvider } from '../providers/indicators'
import type { BlocksProvider } from '../providers/blocks'
import type { FieldsProvider } from '../providers/fields'
import type { ElementProvider } from '../providers/element'
import type { CommandsProvider } from '../providers/commands'
import type { TourProvider } from '../providers/tour'
import type { ThemeProvider } from '../providers/theme'
import type { DefinitionProvider } from '../providers/definition'
import type { PermissionsProvider } from '../providers/permissions'
import type { AdaptersProvider } from '../providers/adapters'
import type { AnalyzeProvider } from '../providers/analyze'
import type { ReadabilityProvider } from '../providers/readability'
import type { FieldValueProvider } from '../providers/fieldValue'
import type { DragDropProvider } from '../providers/dragdrop'
import type { CacheProvider } from '../providers/cache'

export interface BlokkliApp {
  /**
   * The adapter.
   */
  adapter: FullBlokkliAdapter<any>

  /**
   * The adapters provider for accessing base adapter and extensions.
   */
  adapters: AdaptersProvider

  eventBus: Eventbus

  dom: DomProvider
  storage: StorageProvider
  types: BlockDefinitionProvider
  selection: SelectionProvider
  blocks: BlocksProvider
  keyboard: KeyboardProvider
  element: ElementProvider
  ui: UiProvider
  animation: AnimationProvider
  definitions: DefinitionProvider
  state: StateProvider
  context: ComputedRef<AdapterContext>
  $t: TextProvider
  broadcast: BroadcastProvider
  features: FeaturesProvider
  theme: ThemeProvider
  commands: CommandsProvider
  tour: TourProvider
  debug: DebugProvider
  indicators: IndicatorsProvider
  plugins: PluginProvider
  directive: DirectiveProvider
  fields: FieldsProvider
  icons: IconsProvider
  permissions: PermissionsProvider
  analyze: AnalyzeProvider
  readability: ReadabilityProvider
  fieldValue: FieldValueProvider
  dragdrop: DragDropProvider
  cache: CacheProvider
}
