# getAnalyzers

Get content analyzers for the editor.

## Signature

```typescript
getAnalyzers?: () =>
  | Analyzer
  | Analyzer[]
  | Promise<Analyzer>
  | Promise<Analyzer[]>
```

## Returns

An analyzer, array of analyzers, or a promise that resolves to analyzer(s).

## Description

Analyzers are tools that check content for accessibility, SEO, or other quality
issues. This method returns analyzer definitions that the editor will use to
validate content.

Analyzers can be either:

- **Manual**: Run when the user explicitly triggers them
- **Continuous**: Run automatically as content changes

## Example

```typescript
getAnalyzers: () => {
  return [
    {
      id: 'heading-structure',
      title: 'Heading Structure',
      description: 'Check if headings follow a logical hierarchy',
      type: 'manual',
      run: async (provider) => {
        const headings = provider.querySelectorAll('h1, h2, h3, h4, h5, h6')
        const violations = []

        // Check heading hierarchy
        for (let i = 0; i < headings.length; i++) {
          // ... analyze headings
        }

        return {
          status: violations.length > 0 ? 'violation' : 'pass',
          nodes: violations,
        }
      },
    },
  ]
}
```

See the analyzer documentation for more details on creating custom analyzers.
