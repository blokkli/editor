import type { Command } from '#blokkli/types'

type CommandsProviderFunction = () => Command[] | Command

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

  const getCommands = () => functions.flatMap((fn) => fn())

  return {
    add,
    remove,
    getCommands,
  }
}
