# userSettings

Manage user-specific editor settings.

## Signature

```typescript
userSettings?: {
  load: () => Promise<string | Record<string, any>>
  persist: (settings: string) => Promise<undefined>
}
```

## Properties

### load

Load user settings from storage.

#### Returns

A promise that resolves to the settings as a string or object.

### persist

Save user settings to storage.

#### Parameters

- **settings**: The settings to save, serialized as a JSON string.

#### Returns

A promise that resolves when settings are saved.

## Description

User settings allow the editor to save and restore user-specific preferences
like:

- UI layout preferences
- Enabled/disabled features
- View options
- Tool preferences

Settings are typically stored on the backend associated with the current user
account, so they persist across devices and sessions.

## Example

```typescript
userSettings: {
  load: async () => {
    const response = await fetch('/api/user/blokkli-settings')
    const data = await response.json()
    return data.settings || {}
  },

  persist: async (settings) => {
    await fetch('/api/user/blokkli-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings }),
    })
  },
}
```
