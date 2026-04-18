import type { ModuleContext } from '../build/ModuleContext'
import type { ModuleHelper } from '../build/ModuleHelper'
import type { ModuleOptions } from '../build/types'

export type Blokkli = {
  helper: ModuleHelper
  context: ModuleContext
  $t: (
    key: string,
    defaultText: string,
  ) => { key: string; defaultTranslation: string }
}

type BlokkliModuleInit<O extends object> = {
  alterOptions?: (options: ModuleOptions) => void
  setup: (app: Blokkli, options: O) => Promise<void> | void
}

export type BlokkliModule<O extends object = object> = {
  options?: O
  init: BlokkliModuleInit<O>
}

export function defineBlokkliModule<
  O extends object,
  // Whether there is at least one required option.
  HasOptions = object extends O ? true : false,
>(
  init: BlokkliModuleInit<O>,
): HasOptions extends true
  ? // No option properties are required.
    (options?: O) => BlokkliModule<O>
  : // Some option properties are required, thus an object argument is required.
    (options: O) => BlokkliModule<O> {
  return function (options?: O) {
    return {
      options,
      init,
    }
  }
}
