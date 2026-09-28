<?php

declare(strict_types=1);

namespace Drupal\blokkli_playground\Seed;

/**
 * Problems in the content files, each with its file and path.
 */
final class SeedException extends \RuntimeException {

  public function __construct(
    public readonly array $messages,
  ) {
    parent::__construct(implode("\n", $messages));
  }

}
