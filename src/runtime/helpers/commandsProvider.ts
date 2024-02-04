import type { Command } from '#blokkli/types'
import { falsy } from '.'

type CommandsProviderFunction = () => Command[] | Command | undefined

export type CommandsProvider = {
  add: (fn: CommandsProviderFunction) => void
  remove: (fn: CommandsProviderFunction) => void
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
