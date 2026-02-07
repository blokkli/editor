export const ALL_PERMISSIONS = [
  'manage_default_templates',
  'create_library_item',
  'edit_library_item',
  'create_comments',
  'view_comments',
  'use_agent',
] as const

export type UserPermissions = (typeof ALL_PERMISSIONS)[number]
