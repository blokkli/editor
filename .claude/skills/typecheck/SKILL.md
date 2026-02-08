---
description: Run the right typecheck command based on which files were changed
---

# Typecheck Skill

The project has multiple TypeScript projects with separate tsconfigs. Use the
narrowest typecheck command that covers the files you changed — running all
typechecks is slow and usually unnecessary.

## Commands

| Command                        | What it checks           | When to use                                                                                                              |
| ------------------------------ | ------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `npm run typecheck`            | Everything (all 4 below) | Final validation before committing                                                                                       |
| `npm run typecheck:build`      | Build-time code          | Changed `src/build/`, `src/module.ts`, `src/module/`, `src/modules/*/index.ts`, `src/modules/*/build/`, `nuxt.config.ts` |
| `npm run typecheck:runtime`    | Runtime/client code      | Changed `src/runtime/`, `src/modules/*/runtime/` (excluding server), `src/global/`                                       |
| `npm run typecheck:server`     | Server/Nitro code        | Changed `src/modules/*/runtime/server/`                                                                                  |
| `npm run typecheck:playground` | Playground/mock code     | Changed `playground/`                                                                                                    |

## Which command to run

Pick based on the files you modified:

- **`src/runtime/**`** or **`src/global/**`** → `npm run typecheck:runtime`
- **`src/build/**`**, **`src/module.ts`**, **`src/module/**`** →
  `npm run typecheck:build`
- **`src/modules/\*/runtime/server/**`** → `npm run typecheck:server`
- **`src/modules/\*/runtime/**`** (non-server) → `npm run typecheck:runtime`
- **`src/modules/*/index.ts`**, **`src/modules/\*/build/**`** → `npm run
  typecheck:build`
- **`playground/**`** → `npm run typecheck:playground`
- **Multiple areas** → `npm run typecheck`

## Notes

- All typecheck commands require `npm run dev:prepare` to have been run first
  (generates `.nuxt/` type stubs)
- If you changed build templates (`src/build/templates/`), the generated types
  may be stale — run `npm run dev:prepare` before typechecking
- The runtime typecheck is typically the most useful one during development
  since most editor code lives in `src/runtime/`
