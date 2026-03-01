import { describe, it, expect } from 'vitest'
import { transformToolSource } from './AgentToolStripPlugin'

// Helper: simulate esbuild output for a tool source.
// esbuild converts `export default X` → `var stdin_default = X; export { stdin_default as default }`
function esbuildStyle(body: string): string {
  return `${body}\nexport {\n  stdin_default as default\n};\n`
}

// ============================================================================
// Standard tool: strips non-kept props, keeps name/description/category/paramsSchema
// ============================================================================

describe('transformToolSource — standard tool', () => {
  it('strips execute, label, and keeps metadata + paramsSchema', () => {
    const input = esbuildStyle(`
import { z } from "zod";
import { defineBlokkliAgentTool } from "#blokkli/agent/app/composables";
var paramsSchema = z.object({ uuid: z.string() });
var stdin_default = defineBlokkliAgentTool({
  name: "my_tool",
  description: "Does something",
  category: "query",
  modes: ["editing"],
  paramsSchema,
  label() { return "Running..."; },
  execute(ctx, params) { return { result: {} }; }
});
`)

    const result = transformToolSource(input)

    expect(result).toContain('"my_tool"')
    expect(result).toContain('"Does something"')
    expect(result).toContain('"query"')
    expect(result).toContain('paramsSchema')
    expect(result).toContain('modes')
    // Stripped properties
    expect(result).not.toContain('execute')
    expect(result).not.toContain('label()')
    // The defineBlokkliAgentTool wrapper should be unwrapped
    expect(result).not.toContain('defineBlokkliAgentTool')
  })
})

// ============================================================================
// Import handling: usage-based dead import removal
// ============================================================================

describe('transformToolSource — import removal', () => {
  it('keeps imports whose bindings are used in kept code', () => {
    const input = esbuildStyle(`
import { z } from "zod";
import { parentSchema } from "../schemas";
var paramsSchema = z.object({ parent: parentSchema });
var stdin_default = defineBlokkliAgentTool({
  name: "test",
  description: "test",
  category: "query",
  paramsSchema
});
`)

    const result = transformToolSource(input)
    expect(result).toContain('from "zod"')
    expect(result).toContain('from "../schemas"')
  })

  it('keeps imports with .js extension when bindings are used', () => {
    const input = esbuildStyle(`
import { z } from "zod";
import { parentSchema } from "../schemas.js";
var paramsSchema = z.object({ parent: parentSchema });
var stdin_default = defineBlokkliAgentTool({
  name: "test",
  description: "test",
  category: "query",
  paramsSchema
});
`)

    const result = transformToolSource(input)
    expect(result).toContain('from "../schemas.js"')
  })

  it('keeps imports from any source as long as bindings are used', () => {
    const input = esbuildStyle(`
import { z } from "zod";
import { COLORS } from "#blokkli-build/charts-config";
var paramsSchema = z.object({ color: z.enum(COLORS) });
var stdin_default = defineBlokkliAgentTool({
  name: "test",
  description: "test",
  category: "query",
  paramsSchema
});
`)

    const result = transformToolSource(input)
    expect(result).toContain('from "#blokkli-build/charts-config"')
  })

  it('removes imports whose bindings are only used in stripped properties', () => {
    const input = esbuildStyle(`
import { z } from "zod";
import { defineBlokkliAgentTool } from "#blokkli/agent/app/composables";
import { resolvePosition } from "#blokkli/agent/app/tools/helpers";
import { useSomething } from "#blokkli/helpers";
import { uuid } from "#blokkli/editor/helpers/uuid";
var paramsSchema = z.object({ id: z.string() });
var stdin_default = defineBlokkliAgentTool({
  name: "test",
  description: "test",
  category: "query",
  paramsSchema,
  execute() { resolvePosition(); useSomething(); uuid(); }
});
`)

    const result = transformToolSource(input)
    expect(result).not.toContain('#blokkli/agent/app/composables')
    expect(result).not.toContain('#blokkli/agent/app/tools/helpers')
    expect(result).not.toContain('#blokkli/helpers')
    expect(result).not.toContain('#blokkli/editor/helpers/uuid')
  })

  it('removes .vue component imports when component prop is stripped', () => {
    const input = esbuildStyle(`
import { z } from "zod";
import Component from "./Component.vue";
var paramsSchema = z.object({ id: z.string() });
var stdin_default = defineBlokkliAgentTool({
  name: "test",
  description: "test",
  category: "query",
  paramsSchema,
  component: Component
});
`)

    const result = transformToolSource(input)
    expect(result).not.toContain('Component.vue')
    expect(result).not.toContain('component')
  })

  it('removes imports unused in remaining code', () => {
    const input = esbuildStyle(`
import { z } from "zod";
import { something } from "some-unknown-lib";
var paramsSchema = z.object({ id: z.string() });
var stdin_default = defineBlokkliAgentTool({
  name: "test",
  description: "test",
  category: "query",
  paramsSchema,
  execute() { something(); }
});
`)

    const result = transformToolSource(input)
    expect(result).not.toContain('some-unknown-lib')
    expect(result).toContain('from "zod"')
  })

  it('removes unused imports even when not referenced anywhere', () => {
    const input = esbuildStyle(`
import { z } from "zod";
import { COLORS } from "#blokkli-build/charts-config";
var paramsSchema = z.object({ id: z.string() });
var stdin_default = defineBlokkliAgentTool({
  name: "test",
  description: "test",
  category: "query",
  paramsSchema
});
`)

    const result = transformToolSource(input)
    expect(result).not.toContain('#blokkli-build/charts-config')
  })
})

it('removes top-level functions only reachable from stripped properties', () => {
  const input = esbuildStyle(`
import { z } from "zod";
import { parentSchema } from "../schemas";
import { resolvePosition } from "../helpers";
import { itemEntityType } from "#blokkli-build/config";
var paramsSchema = z.object({ parent: parentSchema });
function validateTree(ctx) { return itemEntityType; }
function buildBlocks(ctx) { return resolvePosition(); }
var stdin_default = defineBlokkliAgentTool({
  name: "test",
  description: "test",
  category: "mutation",
  paramsSchema,
  execute(ctx, params) { validateTree(ctx); buildBlocks(ctx); }
});
`)

  const result = transformToolSource(input)
  // Dead functions and their imports should be gone.
  expect(result).not.toContain('validateTree')
  expect(result).not.toContain('buildBlocks')
  expect(result).not.toContain('resolvePosition')
  expect(result).not.toContain('itemEntityType')
  expect(result).not.toContain('#blokkli-build/config')
  expect(result).not.toContain('../helpers')
  // Needed imports survive.
  expect(result).toContain('from "zod"')
  expect(result).toContain('from "../schemas"')
})

it('keeps top-level declarations transitively needed by paramsSchema', () => {
  const input = esbuildStyle(`
import { z } from "zod";
import { optionValueSchema } from "../schemas";
var fieldSchema = z.record(z.string(), optionValueSchema);
var paramsSchema = z.object({ fields: fieldSchema });
var stdin_default = defineBlokkliAgentTool({
  name: "test",
  description: "test",
  category: "query",
  paramsSchema
});
`)

  const result = transformToolSource(input)
  expect(result).toContain('fieldSchema')
  expect(result).toContain('optionValueSchema')
  expect(result).toContain('from "../schemas"')
})

// ============================================================================
// defineBlokkliAgentTool unwrapping
// ============================================================================

describe('transformToolSource — unwrapping', () => {
  it('replaces defineBlokkliAgentTool(...) with plain object', () => {
    const input = esbuildStyle(`
import { z } from "zod";
var paramsSchema = z.object({});
var stdin_default = defineBlokkliAgentTool({
  name: "test",
  description: "test",
  category: "query",
  paramsSchema
});
`)

    const result = transformToolSource(input)
    // Should not contain the wrapper call
    expect(result).not.toContain('defineBlokkliAgentTool')
    // Should still be valid (contain the object contents)
    expect(result).toContain('"test"')
  })

  it('handles export default form (non-esbuild)', () => {
    const input = `
import { z } from "zod";
var paramsSchema = z.object({});
export default defineBlokkliAgentTool({
  name: "test",
  description: "test",
  category: "query",
  paramsSchema
});
`

    const result = transformToolSource(input)
    expect(result).not.toContain('defineBlokkliAgentTool')
    expect(result).toContain('"test"')
  })
})

// ============================================================================
// Validation
// ============================================================================

describe('transformToolSource — validation', () => {
  it('throws when required properties are missing', () => {
    const input = esbuildStyle(`
import { z } from "zod";
var stdin_default = defineBlokkliAgentTool({
  name: "test"
});
`)

    expect(() => transformToolSource(input)).toThrow(
      'missing required properties',
    )
  })

  it('includes file path in error when provided', () => {
    const input = esbuildStyle(`
import { z } from "zod";
var stdin_default = defineBlokkliAgentTool({
  name: "test"
});
`)

    expect(() => transformToolSource(input, '/path/to/tool/index.ts')).toThrow(
      '/path/to/tool/index.ts',
    )
  })
})

// ============================================================================
// Properties stripping
// ============================================================================

describe('transformToolSource — property stripping', () => {
  it('strips all runtime-only properties', () => {
    const input = esbuildStyle(`
import { z } from "zod";
var paramsSchema = z.object({ id: z.string() });
var resultSchema = z.object({ data: z.any() });
var stdin_default = defineBlokkliAgentTool({
  name: "test",
  description: "test",
  category: "query",
  paramsSchema,
  resultSchema,
  label() { return "Running..."; },
  prunedSummary: (r) => "done",
  mockParams: { id: "123" },
  mockParamsVariants: [{ id: "456" }],
  requiresApproval: true,
  icon: "edit",
  execute(ctx, params) { return {}; }
});
`)

    const result = transformToolSource(input)
    expect(result).toContain('"test"')
    expect(result).toContain('paramsSchema')
    // The var declaration for resultSchema remains (top-level), but the
    // property inside the tool object should be removed.
    // Extract just the object literal to check properties.
    const objectMatch = result.match(/stdin_default = \{([\s\S]*?)\};/)
    expect(objectMatch).toBeTruthy()
    const objectBody = objectMatch![1]!
    expect(objectBody).not.toContain('resultSchema')
    expect(objectBody).not.toContain('execute')
    expect(objectBody).not.toMatch(/\blabel\b/)
    expect(objectBody).not.toContain('prunedSummary')
    expect(objectBody).not.toContain('mockParams')
    expect(objectBody).not.toContain('mockParamsVariants')
    expect(objectBody).not.toContain('requiresApproval')
    expect(objectBody).not.toContain('icon')
  })

  it('keeps non-stripped properties like modes, lazy, volatile', () => {
    const input = esbuildStyle(`
import { z } from "zod";
var paramsSchema = z.object({});
var stdin_default = defineBlokkliAgentTool({
  name: "test",
  description: "test",
  category: "query",
  modes: ["editing", "translating"],
  lazy: true,
  volatile: true,
  paramsSchema
});
`)

    const result = transformToolSource(input)
    expect(result).toContain('modes')
    expect(result).toContain('lazy')
    expect(result).toContain('volatile')
  })
})
