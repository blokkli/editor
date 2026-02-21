import type { Plugin } from 'rollup'
import * as fs from 'node:fs'
import * as path from 'node:path'
import MagicString from 'magic-string'
import { parse } from 'acorn'
import { walk, type Node } from 'estree-walker-ts'
import { transformSync } from 'esbuild'
import type {
  ImportDeclaration,
  CallExpression,
  ObjectExpression,
  Property,
} from 'estree'

const QUERY = '?blokkliAgentTool'

/**
 * Properties to remove from the tool definition object.
 * These are runtime-only (client-side) and not needed on the server.
 */
const PROPERTIES_TO_REMOVE = new Set([
  'execute',
  'resultSchema',
  'component',
  'label',
  'prunedSummary',
  'mockParams',
  'mockParamsVariants',
  'requiresApproval',
  'icon',
])

/**
 * Allowlist of import sources that are safe for server-side use.
 * Any import NOT in this set is removed. This is safer than a blocklist
 * because unknown/new imports fail closed (removed) rather than fail open
 * (kept and potentially breaking the Nitro server build).
 */
const SERVER_SAFE_IMPORTS = new Set([
  'zod',
  '../schemas',
  '#blokkli/agent/app/tools/schemas',
  '../chart_schemas',
  '#blokkli-build/charts-config',
])

/**
 * Check if an import source is safe for server-side use.
 */
function isServerSafeImport(source: string): boolean {
  return SERVER_SAFE_IMPORTS.has(source)
}

type ASTNode = Node & { start: number; end: number }
type PositionedObjectExpression = ObjectExpression & {
  start: number
  end: number
}
type PositionedCallExpression = CallExpression & { start: number; end: number }

type ToolExportInfo = {
  toolObject: PositionedObjectExpression
  call: PositionedCallExpression
}

/**
 * Rollup plugin that intercepts imports with `?blokkliAgentTool` query param
 * and strips runtime-only properties, producing server-safe modules that export
 * only the static metadata + Zod paramsSchema.
 *
 * The plugin uses esbuild to compile TypeScript to JavaScript first, then
 * parses the result with acorn and strips client-only code with MagicString.
 *
 * Factory tools (those with a `resolve` property) are exported as `null`.
 */
export function agentToolStripPlugin(): Plugin {
  return {
    name: 'blokkli:agent-tool-strip',

    resolveId(source, importer) {
      if (!source.includes(QUERY)) return null

      const cleanPath = source.replace(QUERY, '')
      let resolved: string

      if (
        importer &&
        (cleanPath.startsWith('.') || cleanPath.startsWith('/'))
      ) {
        const importerDir = path.dirname(importer)
        resolved = path.resolve(importerDir, cleanPath)
      } else {
        resolved = cleanPath
      }

      // Templates strip .ts — try adding it back.
      if (!fs.existsSync(resolved) && fs.existsSync(resolved + '.ts')) {
        resolved = resolved + '.ts'
      }

      return resolved + QUERY
    },

    load(id) {
      if (!id.includes(QUERY)) return null

      const filePath = id.replace(QUERY, '')
      let rawSource: string
      try {
        rawSource = fs.readFileSync(filePath, 'utf-8')
      } catch {
        this.error(`Cannot read agent tool file: ${filePath}`)
      }

      // Use esbuild to strip TypeScript syntax, producing clean JavaScript.
      const { code: jsSource } = transformSync(rawSource, {
        loader: 'ts',
        format: 'esm',
        target: 'esnext',
      })

      return transformToolSource(jsSource, filePath)
    },
  }
}

/**
 * Find the top-level `defineBlokkliAgentTool({...})` call in the AST.
 *
 * After esbuild compilation, `export default X` becomes
 * `var stdin_default = X; export { stdin_default as default }`,
 * so we look for VariableDeclarator init or ExportDefaultDeclaration.
 */
function findToolExport(ast: ASTNode): ToolExportInfo | null {
  let result: ToolExportInfo | null = null

  walk(ast, {
    enter(node) {
      if (result) return

      let callExpr: (CallExpression & { start: number; end: number }) | null =
        null

      // Match `export default defineBlokkliAgentTool({...})`
      if (node.type === 'ExportDefaultDeclaration') {
        const decl = (node as any).declaration
        if (
          decl?.type === 'CallExpression' &&
          decl.callee?.type === 'Identifier' &&
          decl.callee.name === 'defineBlokkliAgentTool'
        ) {
          callExpr = decl
        }
      }

      // Match `var foo = defineBlokkliAgentTool({...})` (esbuild output)
      if (node.type === 'VariableDeclarator') {
        const init = (node as any).init
        if (
          init?.type === 'CallExpression' &&
          init.callee?.type === 'Identifier' &&
          init.callee.name === 'defineBlokkliAgentTool'
        ) {
          callExpr = init
        }
      }

      if (!callExpr) return

      const arg = callExpr.arguments[0]
      if (arg?.type !== 'ObjectExpression') return

      const toolObject = arg as PositionedObjectExpression

      result = { toolObject, call: callExpr }
    },
    leave() {},
  })

  return result
}

/**
 * Required properties that must be present in the transformed tool output.
 */
const REQUIRED_PROPERTIES = new Set([
  'name',
  'description',
  'category',
  'paramsSchema',
])

/**
 * Validate that the transformed output is valid JS and contains the required
 * tool properties. Returns an error message if validation fails, or null if OK.
 */
function validateTransformedOutput(
  output: string,
  filePath?: string,
): string | null {
  let ast: ASTNode
  try {
    ast = parse(output, {
      sourceType: 'module',
      ecmaVersion: 'latest',
    }) as ASTNode
  } catch (e) {
    return `Transformed output is not valid JavaScript${filePath ? ` (${filePath})` : ''}: ${e}`
  }

  // Find the default export's object literal.
  let exportedObject: ObjectExpression | null = null

  walk(ast, {
    enter(node) {
      if (exportedObject) return

      if (node.type === 'ExportDefaultDeclaration') {
        const decl = (node as any).declaration
        if (decl?.type === 'ObjectExpression') {
          exportedObject = decl
        }
      }

      // esbuild pattern: var stdin_default = {...}; export { stdin_default as default }
      if (node.type === 'VariableDeclarator') {
        const id = (node as any).id
        const init = (node as any).init
        if (
          id?.type === 'Identifier' &&
          id.name === 'stdin_default' &&
          init?.type === 'ObjectExpression'
        ) {
          exportedObject = init
        }
      }
    },
    leave() {},
  })

  if (!exportedObject) {
    return `No default-exported object found in transformed output${filePath ? ` (${filePath})` : ''}`
  }

  const foundProps = new Set<string>()
  for (const prop of (exportedObject as ObjectExpression).properties) {
    if (prop.type !== 'Property') continue
    const key = prop.key
    if (key.type === 'Identifier') {
      foundProps.add(key.name)
    } else if (key.type === 'Literal' && typeof key.value === 'string') {
      foundProps.add(key.value)
    }
  }

  const missing = [...REQUIRED_PROPERTIES].filter((p) => !foundProps.has(p))
  if (missing.length > 0) {
    return `Transformed tool output is missing required properties: ${missing.join(', ')}${filePath ? ` (${filePath})` : ''}`
  }

  return null
}

/**
 * Transform a compiled JS tool source to remove runtime-only code.
 *
 * Parses the JS with acorn, then uses MagicString to:
 * 1. Remove non-allowlisted imports
 * 2. Remove runtime-only properties from the tool definition object
 * 3. Replace the `defineBlokkliAgentTool(...)` wrapper with a plain object literal
 *
 * Exported for testing.
 */
export function transformToolSource(source: string, filePath?: string): string {
  const ast = parse(source, {
    sourceType: 'module',
    ecmaVersion: 'latest',
  }) as ASTNode

  const exportInfo = findToolExport(ast)
  if (!exportInfo) {
    return source
  }

  const s = new MagicString(source)
  const { toolObject, call } = exportInfo

  // 1. Remove client-only imports.
  walk(ast, {
    enter(node) {
      if (node.type !== 'ImportDeclaration') return

      const importDecl = node as ImportDeclaration & {
        start: number
        end: number
      }
      const importSource = importDecl.source.value as string

      if (!isServerSafeImport(importSource)) {
        let removeEnd = importDecl.end
        if (source[removeEnd] === '\n') {
          removeEnd++
        }
        s.remove(importDecl.start, removeEnd)
      }
    },
    leave() {},
  })

  // 2. Remove unwanted properties from the tool object.
  for (const prop of toolObject.properties) {
    if (prop.type !== 'Property') continue

    const key = prop.key
    let name: string | null = null
    if (key.type === 'Identifier') {
      name = key.name
    } else if (key.type === 'Literal' && typeof key.value === 'string') {
      name = key.value
    }

    if (name && PROPERTIES_TO_REMOVE.has(name)) {
      const propNode = prop as Property & { start: number; end: number }
      let removeEnd = propNode.end

      // Remove trailing comma if present.
      const afterProp = source.substring(removeEnd)
      const commaMatch = afterProp.match(/^\s*,/)
      if (commaMatch) {
        removeEnd += commaMatch[0].length
      }

      s.remove(propNode.start, removeEnd)
    }
  }

  // 3. Replace the `defineBlokkliAgentTool(...)` call with just the object literal.
  s.overwrite(call.start, toolObject.start, '')
  s.overwrite(toolObject.end, call.end, '')

  const result = s.toString()

  // 4. Validate the output.
  const error = validateTransformedOutput(result, filePath)
  if (error) {
    throw new Error(error)
  }

  return result
}
