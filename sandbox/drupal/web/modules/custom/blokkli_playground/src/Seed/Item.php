<?php

declare(strict_types=1);

namespace Drupal\blokkli_playground\Seed;

/**
 * An entity or paragraph from the content files, ready to be created.
 */
final class Item {

  public function __construct(
    public readonly string $entityType,
    public readonly string $bundle,
    public readonly ?string $key,
    public readonly string $uuid,
    public readonly string $source,
    // The languages that appear in it, its paragraphs included.
    public readonly array $languages,
    // The languages it gets a translation in.
    public readonly array $translations,
    // Field values by langcode. Paragraphs are items, references refs.
    public readonly array $values,
    public readonly array $options,
    public readonly array $outdated,
    // Where it is in the content files, for messages.
    public readonly string $path,
    // Broken on purpose (E2E fixtures): neither its constraints nor whether
    // its field allows it are checked.
    public readonly bool $invalid = FALSE,
  ) {}

}
