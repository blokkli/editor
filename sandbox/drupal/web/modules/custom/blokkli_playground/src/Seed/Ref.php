<?php

declare(strict_types=1);

namespace Drupal\blokkli_playground\Seed;

/**
 * A reference to a seeded entity by its key, resolved when it's created.
 */
final class Ref {

  public function __construct(
    public readonly string $entityType,
    public readonly string $key,
    // A link field's URI (entity:node/1) instead of the ID.
    public readonly bool $asUri = FALSE,
  ) {}

}
