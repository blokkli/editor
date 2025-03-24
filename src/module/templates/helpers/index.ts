export function toObject(
  name: string,
  map: Map<string, string>,
  noExport?: boolean,
): string {
  const lines = [...map.entries()]
    .map(([key, value]) => {
      return `${key}: ${value}`
    })
    .sort()
    .join(',\n  ')
  if (noExport) {
    return `
const ${name} = {
  ${lines}
}
`
  }
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
    .sort()
    .join('\n')
}
