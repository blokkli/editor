# Custom Skills

Skills are domain-specific guidelines that the LLM can load on demand. They're
ideal for style guides, content policies, brand guidelines, or language rules
that the LLM doesn't need in every conversation — only when relevant.

## How Skills Work

Skills are listed by name and description in the system prompt. When the LLM
determines it needs a skill, it calls the built-in `load_skill` tool. The skill
content is then injected into the conversation.

This keeps the base system prompt small while still giving the LLM access to
extensive domain knowledge when needed.

## File Location

Place skill files in `blokkli/skills/` in your project root. Each file
default-exports a skill definition. They are auto-discovered at build time.

```
blokkli/
  skills/
    brand-guidelines.ts
    content-policy.ts
```

::: warning
Skills run on the **server** (Nitro), not in the browser. Use the server-side
import path.
:::

## Defining a Skill

```ts
// blokkli/skills/brand-guidelines.ts
import { defineBlokkliAgentSkill } from '#blokkli/agent/server/skills'

export default defineBlokkliAgentSkill({
  name: 'brand-guidelines',
  label: 'Brand Guidelines',
  description:
    'Writing style and tone of voice guidelines. Load when creating or rewriting content.',
  getContents: () => {
    return `## Brand Voice

- Use active voice
- Keep sentences short (max 20 words)
- Address the reader directly ("you")
- Avoid jargon and buzzwords
`
  },
})
```

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Unique identifier in kebab-case |
| `label` | `string \| SkillLabel` | Human-readable label shown in the UI |
| `description` | `string` | Tells the LLM when to use this skill |
| `getContents` | `(context: PageContext) => string \| null` | Returns the skill content, or `null` to hide it |

## Translatable Labels

The `label` property can be a plain string or an object with translations:

```ts
{
  label: {
    en: 'Plain Language',
    de: 'einfache Sprache',
    fr: 'Langage simple',
  },
}
```

When an object, `en` is required as the fallback. Other supported languages:
`de`, `fr`, `it`, `gsw_CH`.

## Context-Aware Skills

The `getContents` function receives the current `PageContext`. Return `null` to
hide the skill when it's not applicable:

```ts
export default defineBlokkliAgentSkill({
  name: 'german-rules',
  label: {
    en: 'German Writing Rules',
    de: 'Deutsche Schreibregeln',
  },
  description: 'Grammar and style rules for German content.',
  getContents: (context) => {
    // Only show for German content
    if (context.entityLanguage !== 'de') {
      return null
    }
    return `## German Writing Rules
...
`
  },
})
```

The `PageContext` includes:

| Property | Description |
|----------|-------------|
| `title` | Page title |
| `entityType` | Page entity type |
| `entityBundle` | Page bundle (e.g. `'article'`, `'landing_page'`) |
| `entityLanguage` | Content language code (e.g. `'en'`, `'de'`) |
| `interfaceLanguage` | UI language code |
| `editMode` | Current edit mode |
| `bundles` | Available block bundles |

## Full Example

This example from the playground provides German "Plain Language" guidelines:

```ts
// blokkli/skills/einfacheSprache.ts
import { defineBlokkliAgentSkill } from '#blokkli/agent/server/skills'

export default defineBlokkliAgentSkill({
  name: 'einfache-sprache',
  label: 'einfache Sprache',
  description:
    'Regeln für "einfache Sprache" auf Deutsch. Benutze dies wenn du Texte erstellen musst.',
  getContents: () => {
    return `## SPRACHLICHE RICHTLINIEN:

### Einfache Sprache

- Verwenden Sie allgemein bekannte Wörter.
- Ersetzen Sie Fach- und Fremdwörter durch alltagssprachliche Begriffe.
- Schreiben Sie kurze Sätze mit höchstens 15 Wörtern.
- Schreiben Sie nur einen Gedanken pro Satz.
...
`
  },
})
```

## Use Cases

- **Style guides** — brand voice, tone, writing conventions
- **Content policies** — what topics to avoid, compliance rules
- **Language rules** — grammar rules for specific languages
- **Template guidelines** — how to structure specific page types
- **Accessibility rules** — content accessibility requirements
