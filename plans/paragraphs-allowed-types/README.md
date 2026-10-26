# Paragraphs: new paragraphs skip the allowed types

A bug in Paragraphs, not in blökkli, to report and fix upstream. It was F73 of
the drupal-setup findings, found on 2026-10-12 with a kernel test, and moved
here on 2026-10-26.

## The bug

- **Where:** `ParagraphSelection::validateReferenceableNewEntities()`
  (`src/Plugin/EntityReferenceSelection/ParagraphSelection.php:251-259`), in
  Paragraphs 8.x-1.23 and on the 8.x-1.x branch (2026-10-26).
- **Why:** the closure is `function ($entity)` without `use ($bundles)`. So
  `isset($bundles)` is false in it, and every new paragraph counts as allowed.
- **What it does:** core's `ValidReferenceConstraintValidator` checks new
  entities only through this method; saved ones go through
  `validateReferenceableEntities()`, which works. A saved paragraph in a field
  that doesn't allow its type has a violation (`field_items.0.target_id`), a new
  one has none (it would be `field_items.0.entity`, "This entity (paragraph: …)
  cannot be referenced.").
- **Who gets there:** anything that creates a host with new paragraphs through
  the entity API and validates it: JSON:API, REST, GraphQL mutations, migrations
  that validate, and blökkli's publishing. Paragraphs' widget only offers the
  allowed types, so its forms don't.
- **Not a security issue:** the allowed types are a rule of the content model,
  not access control. A public issue is fine.
- **Upstream:** two web searches (2026-10-26) found no issue, but they didn't
  search the queue itself.

## In blökkli

- A stored `add` that puts a type into a field that doesn't allow it shows no
  violation while editing, and none when the page is published. The paragraph is
  saved, and the next edit state shows the violation.
- A mutation is checked when it's added, so only a stored one gets there: one
  from before that check, or from before the field's settings changed.
- `MutatedStateViolationsTest::testStoredMutation()` in `paragraphs_blokkli`
  covers the stored `move` of a saved paragraph. The stored `add` can't be
  tested before a Paragraphs release has the fix: the module's own test site
  can't apply patches, and drupal.org's CI tests against a release.

## The fix

`function ($entity) use ($bundles)`. The `isset()` is then always true and can
go: `in_array($entity->bundle(), $bundles, TRUE)`.

- **Fields that allow every type keep working:** `getSortedAllowedTypes()`
  returns every type when `target_bundles` is empty, and the others when
  `negate` is set.
- **Library items aren't affected:** their `paragraphs` base field sets no
  `target_bundles`, and the sandbox has no override. "Add to library" puts new
  copies there (version 3 of `make_reusable`), of any type.

## Steps

1. **Look in the Paragraphs issue queue** for an existing issue. Cite one with
   the `drupal-issue-lookup` skill.
2. **Report and fix it upstream** with the `drupal-org-issue-mr` skill:
   - draft the issue (HTML, for drupal.org);
   - the user creates the issue and its issue fork on drupal.org;
   - the fix, with a kernel test in Paragraphs: a host with a new paragraph of a
     type its field doesn't allow has a violation at `<field>.0.entity`; allowed
     types, a negated list and a field without `target_bundles` have none;
   - pushed as a merge request against 8.x-1.x.
3. **The sandbox carries the merge request's diff** until a release has it:
   `sandbox/drupal/patches/paragraphs-<issue>-new-paragraph-allowed-types.patch`
   in `sandbox/drupal/composer.json` (`extra.patches`), like the other patches
   there. Then `composer install`, `drush cr` and a bake.
4. **After a Paragraphs release with the fix:**
   - drop the patch and update `drupal/paragraphs`;
   - add the stored `add` to `MutatedStateViolationsTest`, next to the stored
     `move`; whether `paragraphs_blokkli` then requires that release
     (`drupal/paragraphs: ^1.19` in its `composer.json`) is the user's call;
   - retire this plan.
