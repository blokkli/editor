# Prompts & System Prompts

The agent supports two types of customization for prompts: **user prompts**
(quick-action suggestions) and **system prompt sections** (instructions injected
into the LLM system prompt).

## User Prompts

User prompts are clickable suggestions shown in the dropdown of a selected block
and, opt-in, on the welcome screen of the agent panel. They provide shortcuts
for common tasks.

### File Location

Place prompt files in `blokkli/prompts/` in your project root:

```
blokkli/
  prompts/
    translate-to-german.ts
    summarize-page.ts
```

### Defining a Prompt

```ts
// blokkli/prompts/translate-to-german.ts
import { defineBlokkliAgentPrompt } from '#blokkli/agent/app/composables'

export default defineBlokkliAgentPrompt({
  id: 'translate_to_german',
  getLabel: () => 'Auf Deutsch übersetzen...',
  getPrompt: () => {
    return `Übersetze die ausgewählten Blöcke auf Deutsch. Verwende dazu das
get_content_fields Tool für den Block. Dann verwende update_text_fields um
mehrere Texte auf einmal zu übersetzen. Falls verfügbar, verwende passende
Skills.`
  },
  getUserPrompt: () => {
    return 'Übersetze die ausgewählten Blöcke auf Deutsch.'
  },
})
```

### Properties

| Property        | Type                      | Description                                                        |
| --------------- | ------------------------- | ------------------------------------------------------------------ |
| `id`            | `string`                  | Unique prompt identifier                                           |
| `contexts`      | `('item' \| 'welcome')[]` | Optional. Where the prompt is offered. Defaults to `['item']`.     |
| `getLabel`      | `(app) => string`         | Label shown on the button                                          |
| `getPrompt`     | `(app) => string`         | Full prompt text sent to the LLM                                   |
| `getUserPrompt` | `(app) => string`         | Optional. Text shown in the conversation. Defaults to `getPrompt`. |

The `getUserPrompt` property is useful when the actual prompt contains detailed
tool instructions that would clutter the conversation UI. The user sees the
short version while the LLM receives the detailed one.

### Where a Prompt Is Offered

By default a prompt is only offered in the dropdown of a selected block
(`contexts: ['item']`), where a selection is guaranteed. Add `'welcome'` to also
show it on the welcome screen of the agent panel:

```ts
export default defineBlokkliAgentPrompt({
  id: 'summarize_page',
  contexts: ['item', 'welcome'],
  getLabel: () => 'Summarize the page',
  getPrompt: () => 'Write a short summary of the entire page.',
})
```

::: warning

On the welcome screen usually **nothing is selected**. A prompt offered there
must be written to work without a selection — a wording like "translate the
selected blocks" tells the LLM that nothing was selected. Prompts whose
`preExecute` reads `selectedBlocks` need a fallback for the empty case.

:::

### Prompt Factories

Use a factory to create prompts dynamically based on runtime state:

```ts
import { defineBlokkliAgentPrompt } from '#blokkli/agent/app/composables'

export default defineBlokkliAgentPrompt({
  resolve: (app) => {
    const lang = app.state.language.value
    return {
      id: `translate_to_${lang}`,
      getLabel: () => `Translate to ${lang}`,
      getPrompt: () => `Translate all blocks to ${lang}.`,
    }
  },
})
```

The `resolve` function receives the `BlokkliApp` instance and can return a
single prompt or an array of prompts.

---

## System Prompt Sections

System prompt sections are additional instructions injected into the LLM system
prompt. Use them to add project-specific rules, context, or behavior
modifications.

### File Location

Place system prompt files in `blokkli/system-prompts/` in your project root:

```
blokkli/
  system-prompts/
    project-rules.ts
    content-guidelines.ts
```

::: warning

System prompts run on the **server** (Nitro), not in the browser. Use the
server-side import path.

:::

### Defining a System Prompt Section

```ts
// blokkli/system-prompts/project-rules.ts
import { defineBlokkliAgentSystemPrompt } from '#blokkli/agent/server/system-prompts'

export default defineBlokkliAgentSystemPrompt({
  id: 'project-rules',
  title: 'Project Rules',
  weight: 550,
  cacheGroup: 'static',
  getPrompt: () => {
    return `## Project Rules

- Always use formal language (Sie/Vous) in German and French content
- Image blocks must always have alt text
- Never delete the hero section
`
  },
})
```

### Properties

| Property     | Type                          | Description                                              |
| ------------ | ----------------------------- | -------------------------------------------------------- |
| `id`         | `string`                      | Unique section identifier                                |
| `title`      | `string`                      | Section heading in the assembled prompt                  |
| `weight`     | `number`                      | Position in the prompt (lower = earlier)                 |
| `modes`      | `EditMode[]?`                 | Optional. Only include this section in these edit modes. |
| `cacheGroup` | `'static' \| 'per-page'?`     | Cache strategy (see below)                               |
| `getPrompt`  | `(context) => string \| null` | Returns the prompt text, or `null` to exclude            |

### Weight System

The `weight` determines where the section appears in the assembled system
prompt. Lower weights come first. The built-in sections use these ranges:

| Weight  | Built-in Section                       |
| ------- | -------------------------------------- |
| 100     | Introduction                           |
| 150     | Plan mode (dynamic)                    |
| 200     | Architecture concepts                  |
| 300     | Workflow guidelines                    |
| 400     | Interaction rules                      |
| 600     | Important rules                        |
| 700     | Security                               |
| 800–820 | Page context, block bundles, fragments |
| 900     | Available skills                       |
| 1000    | Available lazy tools                   |

Place custom sections where they make sense. For general project rules, a weight
around 550 (between workflow and important rules) works well.

### Cache Groups

The `cacheGroup` controls how the section is cached for prompt caching
optimization:

| Value        | Behavior                                                                             |
| ------------ | ------------------------------------------------------------------------------------ |
| `'static'`   | Content never changes. Cached indefinitely within TTL.                               |
| `'per-page'` | Content is stable across turns within a conversation. Changes when the page changes. |
| _(omit)_     | Content changes every turn (e.g. plan progress). Not cached.                         |

Prompts are sorted by cache group (`static` → `per-page` → per-turn), then by
weight within each group. This ensures stable prefixes for efficient caching
with both Anthropic (explicit breakpoints) and OpenAI (automatic prefix
caching).

### Context Object

The `getPrompt` function receives a `SystemPromptContext`:

| Property         | Type                      | Description                                            |
| ---------------- | ------------------------- | ------------------------------------------------------ |
| `pageContext`    | `PageContext`             | Current page metadata (title, language, bundles, etc.) |
| `resolvedSkills` | `ResolvedSkill[]`         | Skills that are available for this page                |
| `lazyTools`      | `{ name, description }[]` | Lazy tools that haven't been loaded yet                |
| `isDebugMode`    | `boolean`                 | Whether debug mode is enabled                          |
| `activePlan`     | `ActivePlanContext?`      | Current plan state, if a plan is active                |
| `loadedSkills`   | `ReadonlySet<string>`     | Names of skills already loaded in this conversation    |

### Context-Aware Example

```ts
export default defineBlokkliAgentSystemPrompt({
  id: 'language-rules',
  title: 'Language Rules',
  weight: 550,
  cacheGroup: 'per-page',
  getPrompt: (context) => {
    const lang = context.pageContext.entityLanguage
    if (lang === 'de') {
      return `## Language Rules\n\n- Use formal German (Sie-Form)\n- Follow Duden guidelines`
    }
    if (lang === 'fr') {
      return `## Language Rules\n\n- Use formal French (vouvoiement)\n- Follow Académie française guidelines`
    }
    // No special rules for other languages
    return null
  },
})
```
