import * as ts from 'typescript'
import { parseAndWalk } from 'oxc-walker'

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

/**
 * Type check for falsy values.
 *
 * Used as the callback for array.filter, e.g.
 * items.filter(falsy)
 */
export function falsy<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined
}

const SFC_SCRIPT_RE =
  /<script(?<attrs>[^>]*)>(?<content>[\s\S]*?)<\/script[^>]*>/gi

export function extractScriptContent(sfc: string) {
  const contents: Array<{ loader: 'tsx' | 'ts'; code: string }> = []

  let hasMatch = false
  for (const match of sfc.matchAll(SFC_SCRIPT_RE)) {
    hasMatch = true
    if (match?.groups?.content) {
      contents.push({
        loader:
          match.groups.attrs && /[tj]sx/.test(match.groups.attrs)
            ? 'tsx'
            : 'ts',
        code: match.groups.content.trim(),
      })
    }
  }

  // If no script tags found, assume it's a plain TS/JS file
  if (!hasMatch) {
    contents.push({
      loader: 'ts',
      code: sfc.trim(),
    })
  }

  return contents
}

export function extractObjectLiteral(
  fileContents: string,
  composables: string[],
): string | undefined {
  // Early return if the literal string does not appear in the file contents.
  if (!composables.some((composable) => fileContents.includes(composable))) {
    return undefined
  }

  // Extract script content(s) from the file
  const scripts = extractScriptContent(fileContents)

  for (const script of scripts) {
    try {
      let result: string | undefined

      const filename = script.loader === 'tsx' ? 'temp.tsx' : 'temp.ts'

      parseAndWalk(script.code, filename, {
        parseOptions: {
          range: true,
        },
        enter(node, parent) {
          if (result) return

          if (
            node.type === 'CallExpression' &&
            node.callee.type === 'Identifier' &&
            composables.includes(node.callee.name)
          ) {
            // Find the object expression argument
            for (const arg of node.arguments) {
              if (arg.type === 'ObjectExpression' && arg.range) {
                // Extract the source text using the range property
                result = script.code.substring(arg.range[0], arg.range[1])
                break
              }
            }
          }
        },
      })

      if (result) {
        return result
      }
    } catch (error) {
      console.log(error)
      continue
    }
  }

  return undefined
}
