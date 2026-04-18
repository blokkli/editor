---
description:
  Create changelog entries for new blökkli releases — user-facing, non-technical
  summaries in EN and DE
user_invocable: true
---

# Changelog Skill

Create user-facing changelog entries for blökkli editor releases.

## Target Audience

The changelog is read by **non-technical users** — content editors, site
administrators, and project managers. They do not know or care about internal
implementation details, TypeScript types, adapter methods, or code architecture.

## Tone & Language

- Write from the user's perspective: what can they **do** differently?
- Use simple, everyday language. Avoid technical jargon.
- Don't explain _how_ something works internally — just describe the
  user-visible result.
- Keep entries concise. One or two sentences per item is usually enough.
- Use consistent terminology: if a feature is called "Swap block positions" in
  the UI, use exactly that in the changelog.

### What to avoid

- Implementation details ("refactored provider", "added adapter method")
- Technical terms users don't encounter ("complex option", "field list type",
  "mutation", "composable", "renderer")
- Developer-facing concerns ("type safety", "breaking change in API")

### Preferred terms

Use the terms users actually see in the editor UI. When in doubt, check the
`$t()` translation strings for the correct wording. Some examples:

- "editor option" or "Option mit Editor" instead of "complex option"
- "Button" is fine in German
- "Block-Auswahl" not "Block-Selektor"

## File Structure

Changelogs live in `src/changelog/<version>/` with one file per language:

```
src/changelog/2.0.0-alpha.50/
├── en.md
└── de.md
```

## File Format

```markdown
---
date: 'YYYY-MM-DD'
---

### New Features / Neue Funktionen

#### Feature title

Short description of what users can now do.

### Improvements / Verbesserungen

- Short description of an improvement.

### Fixes / Fehlerbehebungen

- Short description of what was broken and that it's fixed.
```

### Section headers

| EN           | DE               |
| ------------ | ---------------- |
| New Features | Neue Funktionen  |
| Improvements | Verbesserungen   |
| Fixes        | Fehlerbehebungen |

Only include sections that have entries. New features with a longer description
get their own `####` sub-heading. Improvements and fixes are bullet points.

## Workflow

1. Review the commits since the last release to understand what changed
2. Filter for **user-visible** changes only — skip internal refactors, type
   fixes, and build changes
3. Write `en.md` and `de.md` with matching structure and consistent terminology
4. Use today's date in the frontmatter
