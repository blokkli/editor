import type { Plugin } from 'rollup'
import * as fs from 'node:fs'
import * as path from 'node:path'
import MagicString from 'magic-string'
import { parse } from 'acorn'
import { walk, type Node } from 'estree-walker-ts'
import { transformSync, buildSync } from 'esbuild'
import type {
  ImportDeclaration,
  CallExpression,
  ObjectExpression,
  Property,
  Identifier,
} from 'estree'

const QUERY = '?blokkliAgentTool'

/**
 * Properties to KEEP in the stripped tool definition.
 * Everything else is removed. This is the server-side metadata the tool
 * registry needs — anything not listed here is client-only.
 */
const PROPERTIES_TO_KEEP = new Set([
  'name',
  'description',
  'category',
  'paramsSchema',
  'modes',
  'lazy',
  'volatile',
  'requiredAdapterMethods',
])

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
 * strips non-kept properties from the tool object with MagicString, and finally
 * runs esbuild's bundler with tree-shaking to eliminate dead code and imports.
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
        return this.error(`Cannot read agent tool file: ${filePath}`)
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
 * Use esbuild's bundler to tree-shake dead functions and variables.
 *
 * All imports are externalized so esbuild doesn't resolve them — it only
 * performs dead code elimination on the module's own declarations.
 *
 * Note: esbuild keeps imports even when their bindings become unused (because
 * imports may have side effects). Dead import removal is handled separately.
 */
function treeShake(code: string): string {
  const result = buildSync({
    stdin: { contents: code, loader: 'js', resolveDir: '/tmp' },
    bundle: true,
    write: false,
    format: 'esm',
    target: 'esnext',
    treeShaking: true,
    external: ['*'],
  })

  return result.outputFiles[0]!.text
}

/**
 * Remove import declarations whose bindings are not referenced in the code.
 */
function removeDeadImports(code: string): string {
  const ast = parse(code, {
    sourceType: 'module',
    ecmaVersion: 'latest',
  }) as ASTNode

  // Collect ranges of import declarations.
  const importRanges: Array<{ start: number; end: number }> = []
  walk(ast, {
    enter(node) {
      if (node.type === 'ImportDeclaration') {
        const n = node as ImportDeclaration & { start: number; end: number }
        importRanges.push({ start: n.start, end: n.end })
      }
    },
    leave() {},
  })

  // Collect all identifiers referenced outside import declarations.
  const usedIds = new Set<string>()
  walk(ast, {
    enter(node) {
      if (node.type === 'Identifier') {
        const n = node as Identifier & { start: number }
        const inImport = importRanges.some(
          (r) => n.start >= r.start && n.start < r.end,
        )
        if (!inImport) {
          usedIds.add(n.name)
        }
      }
    },
    leave() {},
  })

  const s = new MagicString(code)

  walk(ast, {
    enter(node) {
      if (node.type !== 'ImportDeclaration') return

      const importDecl = node as ImportDeclaration & {
        start: number
        end: number
      }

      const hasUsedBinding = (importDecl.specifiers || []).some((spec) =>
        usedIds.has(spec.local.name),
      )

      if (!hasUsedBinding) {
        let removeEnd = importDecl.end
        if (code[removeEnd] === '\n') {
          removeEnd++
        }
        s.remove(importDecl.start, removeEnd)
      }
    },
    leave() {},
  })

  return s.toString()
}

/**
 * Transform a compiled JS tool source to remove runtime-only code.
 *
 * 1. Parse and strip properties NOT in PROPERTIES_TO_KEEP from the tool object
 * 2. Replace the `defineBlokkliAgentTool(...)` wrapper with a plain object literal
 * 3. Run esbuild with tree-shaking to eliminate dead functions, variables,
 *    and imports that are no longer reachable
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

  // 1. Remove properties NOT in the keep-list.
  for (const prop of toolObject.properties) {
    if (prop.type !== 'Property') continue

    const key = prop.key
    let name: string | null = null
    if (key.type === 'Identifier') {
      name = key.name
    } else if (key.type === 'Literal' && typeof key.value === 'string') {
      name = key.value
    }

    if (name && !PROPERTIES_TO_KEEP.has(name)) {
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

  // 2. Replace the `defineBlokkliAgentTool(...)` call with just the object literal.
  s.overwrite(call.start, toolObject.start, '')
  s.overwrite(toolObject.end, call.end, '')

  // 3. Let esbuild tree-shake dead functions and variables, then remove
  //    imports whose bindings are no longer referenced.
  const result = removeDeadImports(treeShake(s.toString()))

  // 4. Validate the output.
  const error = validateTransformedOutput(result, filePath)
  if (error) {
    throw new Error(error)
  }

  return result
}
