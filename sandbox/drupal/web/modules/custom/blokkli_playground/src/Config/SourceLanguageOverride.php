<?php

declare(strict_types=1);

namespace Drupal\blokkli_playground\Config;

use Drupal\Core\Cache\CacheableMetadata;
use Drupal\Core\Config\ConfigFactoryOverrideInterface;
use Drupal\Core\Config\StorableConfigBase;
use Drupal\Core\Config\StorageInterface;
use Drupal\Core\State\StateInterface;

/**
 * Lists the content's original language first.
 *
 * The seed stores the language it was given, and every sandbox copies it from
 * its template. Its language entity gets a weight below the configured ones,
 * which start at 0. An override is never exported, so the config stays the
 * same whatever the dev site was baked in.
 */
final class SourceLanguageOverride implements ConfigFactoryOverrideInterface {

  /**
   * The state key of the seed's source language.
   */
  public const STATE_KEY = 'blokkli_playground.source_language';

  public function __construct(
    private readonly StateInterface $state,
  ) {}

  /**
   * {@inheritdoc}
   */
  public function loadOverrides($names): array {
    $source = $this->state->get(self::STATE_KEY);
    if (!is_string($source) || !in_array("language.entity.$source", $names, TRUE)) {
      return [];
    }
    return ["language.entity.$source" => ['weight' => -1]];
  }

  /**
   * {@inheritdoc}
   */
  public function getCacheSuffix(): string {
    return 'blokkli_playground_source_language';
  }

  /**
   * {@inheritdoc}
   */
  public function createConfigObject($name, $collection = StorageInterface::DEFAULT_COLLECTION): ?StorableConfigBase {
    return NULL;
  }

  /**
   * {@inheritdoc}
   */
  public function getCacheableMetadata($name): CacheableMetadata {
    return new CacheableMetadata();
  }

}
