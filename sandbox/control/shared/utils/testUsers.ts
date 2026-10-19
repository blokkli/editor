/**
 * The test users of every sandbox (sandbox/drupal/content/users.yml), with
 * their role's id and label (config/sync/user.role.<id>.yml). Access links log
 * in as one of them. test/unit/sandbox-test-users.test.ts compares the list
 * with the content.
 */
export const TEST_USERS = [
  { name: 'Anna Keller', role: 'content_editor', label: 'Editor' },
  { name: 'Marc Brunner', role: 'reviewer', label: 'Head of department' },
  { name: 'Élodie Favre', role: 'translator', label: 'Translator (French)' },
  {
    name: 'Jonas Weber',
    role: 'restricted_editor',
    label: 'Restricted editor',
  },
] as const

export function isTestUser(value: unknown): value is string {
  return TEST_USERS.some((user) => user.name === value)
}
