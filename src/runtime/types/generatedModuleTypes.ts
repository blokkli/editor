// This file is generated by ./scripts/generateTypes/app.ts

export type ModuleOptionsSettings = {
  // Add List
  'feature:add-list:orientation'?: {
    disable?: boolean
    default?: 'vertical' | 'horizontal' | 'sidebar'
  }
  // Page editing
  'feature:artboard:useArtboard'?: { disable?: boolean; default?: 'yes' | 'no' }
  // Persist position and zoom
  'feature:artboard:persist'?: { disable?: boolean; default?: boolean }
  // Artboard scroll speed
  'feature:artboard:scrollSpeed'?: { disable?: boolean; default?: number }
  // Open sidebar when pasting from clipboard
  'feature:clipboard:openSidebarOnPaste'?: {
    disable?: boolean
    default?: boolean
  }
  // Use mouse buttons for undo/redo
  'feature:history:useMouseButtons'?: { disable?: boolean; default?: boolean }
  // Show import dialog at start when page is empty
  'feature:import-existing:showDialogWhenEmpty'?: {
    disable?: boolean
    default?: boolean
  }
  // Use animations
  'feature:settings:useAnimations'?: { disable?: boolean; default?: boolean }
  // Reset all settings
  'feature:settings:resetAllSettings'?: { disable?: boolean }
}