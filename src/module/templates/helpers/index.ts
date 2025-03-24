export function toObject(name: string, map: Map<string, string>): string {
  const lines = [...map.entries()]
    .map(([key, value]) => {
      return `${key}: ${value}`
    })
    .join(',\n  ')
  return `
export const ${name} = {
  ${lines}
}
`
}

export function toImports(map: Map<string, string>): string {
  return [...map.entries()]
    .map(([key, path]) => {
      return `import ${key} from '${path}'`
    })
    .join('\n')
}
