# Data Structure Basics

## Terminology

Throughout blökkli you will find terms like block or entity. It's important to
understand what each of them mean.

Both a page and a block are entities. Every entity has the following attributes:

### entity type

This is the term used to define a specific type of entity. This could be
`block`, `content` or `term`.

### entity bundle

This defines the specific bundle (or "sub type") of an entity type. Using our
examples from before, the three entity types could have these bundles:

#### block

- title
- link
- rich_text

#### content

- editorial
- blog_post

#### term

- category
- person
- location

### entity UUID

Every entity needs to have a UUID. It doesn't have to be an actual UUID - it can
also be `1` or `page_213`. The UUID cannot be empty.

Ideally the UUID is unique for all entities. But the only requirement is that
blocks have a unique UUID.

## Relationships

Every block should belong to exactly one parent entity. In the most basic
example a block of bundle "title" belongs to a content entity of bundle
"blog_post". This is what it might look like in the database:

| entity_type | entity_bundle | uuid | parent_entity_type | parent_entity_uuid |
| ----------- | ------------- | ---- | ------------------ | ------------------ |
| block       | title         | 1    | content            | 123                |
| block       | rich_text     | 2    | content            | 123                |
| block       | title         | 3    | content            | 123                |
| block       | title         | 4    | content            | 5192               |

This guarantees that editing a block on one page does not affect the block on
another page.
