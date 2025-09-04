import * as ts from 'typescript'

export function sortObjectKeys(obj: Record<string, any>): Record<string, any> {
  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys)
  } else if (obj && typeof obj === 'object') {
    const sortedObj: any = {}
    const keys = Object.keys(obj).sort()
    for (const key of keys) {
      sortedObj[key] = sortObjectKeys(obj[key])
    }
    return sortedObj
  }
  return obj
}

export function toValidVariableName(input: string): string {
  // Replace non-alphanumeric characters with underscores.
  let result = input.replace(/\W/g, '_')

  // Ensure the first character is not a number.
  if (/^\d/.test(result)) {
    result = '_' + result
  }

  // Handle empty string edge case
  if (result === '') {
    result = '_empty'
  }

  return result
}

/**
 * Parses a TypeScript object string into a JavaScript object.
 *
 * @param tsObjectStr The TypeScript object string (starting with { and ending with })
 * @returns The parsed JavaScript object.
 */
export function parseTsObject<T>(tsObjectStr: string): {
  object: T
  source: string
} {
  const source = `(${tsObjectStr})`

  // Transpile to JavaScript.
  const result = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.None,
      removeComments: true,
    },
  })

  const jsCode = result.outputText.trim()

  // Safely evaluate the JavaScript which will return our definition object.
  const createObj = new Function(`return ${jsCode}`)
  const object = createObj()
  return { object, source: jsCode }
}

export function extractObjectLiteral(
  fileContents: string,
  composables: string[],
): string | undefined {
  const composablesMatch = composables.join('|')
  const pattern =
    `(${composablesMatch})` +
    `\\(\\s*` +
    `(?:(?!\\{)[^,]*?,\\s*)?` +
    `(\\{[\\s\\S]*?\\})\\s*\\)`
  const rgx = new RegExp(pattern)
  const matches = rgx.exec(fileContents)
  if (!matches) {
    return
  }

  return matches?.at(2)
}

/**
 * Type check for falsy values.
 *
 * Used as the callback for array.filter, e.g.
 * items.filter(falsy)
 */
export function falsy<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined
}
