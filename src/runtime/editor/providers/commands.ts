import { falsy } from '../../helpers'
import type { Command } from '#blokkli/types'

type CommandsProviderFunction = () => Command[] | Command | undefined

export type CommandsProvider = {
  /**
   * Register a command provider function.
   *
   * The function will be called when commands are requested.
   * It can return a single command, an array of commands, or undefined.
   *
   * @param fn - Function that returns commands
   *
   * @example
   * ```ts
   * commands.add(() => ({
   *   id: 'my-command',
   *   label: 'My Command',
   *   callback: () => console.log('executed'),
   * }))
   * ```
   */
  add: (fn: CommandsProviderFunction) => void

  /**
   * Unregister a command provider function.
   *
   * Removes a previously registered function so it no longer provides commands.
   *
   * @param fn - The function to remove (must be the same reference used in add)
   */
  remove: (fn: CommandsProviderFunction) => void

  /**
   * Get all commands from all registered providers.
   *
   * Calls all registered provider functions, flattens the results,
   * and filters out undefined values.
   *
   * @returns Array of all available commands
   */
  getCommands: () => Command[]
}

export default function (): CommandsProvider {
  let functions: CommandsProviderFunction[] = []

  const add = (fn: CommandsProviderFunction) => {
    functions.push(fn)
  }

  const remove = (fn: CommandsProviderFunction) => {
    functions = functions.filter((v) => v !== fn)
  }

  const getCommands = () => functions.flatMap((fn) => fn()).filter(falsy)

  return {
    add,
    remove,
    getCommands,
  }
}
