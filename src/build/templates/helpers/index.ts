export function toObject(
  name: string,
  map: Map<string, string>,
  noExport?: boolean,
): string {
  const lines = [...map.entries()]
    .map(([key, value]) => {
      return `'${key}': ${value}`
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

/**
 * Converts a JavaScript value to a TypeScript type literal string.
 *
 * Useful for generating proper type declarations in ambient modules
 * where you can't use `typeof` on a const value.
 *
 * @example
 * toTypeLiteral({ foo: "bar", count: 42 })
 * // Returns: '{ foo: "bar"; count: 42 }'
 *
 * toTypeLiteral([1, 2, 3])
 * // Returns: '[1, 2, 3]'
 */
export function toTypeLiteral(value: unknown): string {
  if (value === null) {
    return 'null'
  }
  if (value === undefined) {
    return 'undefined'
  }
  if (typeof value === 'string') {
    return JSON.stringify(value)
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]'
    }
    const items = value.map((v) => toTypeLiteral(v))
    return `[${items.join(', ')}]`
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value)
    if (entries.length === 0) {
      return '{}'
    }
    const props = entries
      .map(([key, val]) => {
        const safeKey = /^[a-z_$][\w$]*$/i.test(key) ? key : JSON.stringify(key)
        return `${safeKey}: ${toTypeLiteral(val)}`
      })
      .join('; ')
    return `{ ${props} }`
  }
  return 'unknown'
}
