# getHostTransformPlugins

Get all available host transform plugins.

## Signature

```typescript
getHostTransformPlugins?: () => Promise<HostTransformPlugin[]>
```

## Returns

A promise that resolves to an array of host transform plugin definitions.

## Description

Host transform plugins are similar to regular transform plugins, but they
operate on the host entity (the page being edited) rather than on individual
blocks. These plugins can modify properties or fields of the page entity itself.

## Example

```typescript
getHostTransformPlugins: async () => {
  return [
    {
      id: 'optimize-metadata',
      label: 'Optimize SEO Metadata',
      description: 'Automatically optimize page metadata for SEO',
      preview: true,
      configInputs: [
        {
          type: 'checkbox',
          name: 'includeKeywords',
          label: 'Include Keywords',
          description: 'Add relevant keywords to metadata',
          required: false,
          checkboxLabel: 'Enable keyword optimization',
          defaultValue: true,
        },
      ],
    },
  ]
}
```
