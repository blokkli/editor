<?php

declare(strict_types=1);

namespace Drupal\blokkli_playground\Plugin\Derivative;

use Drupal\Component\Plugin\Derivative\DeriverBase;
use Drupal\Core\Language\LanguageManagerInterface;
use Drupal\Core\Plugin\Discovery\ContainerDeriverInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Derives the transform "Search and replace", one per language.
 *
 * A transform gets no language: each derivative changes the language in its
 * definition's "langcode".
 */
final class SearchAndReplaceDeriver extends DeriverBase implements ContainerDeriverInterface {

  public function __construct(
    protected readonly LanguageManagerInterface $languageManager,
  ) {}

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container, $base_plugin_id): static {
    return new static($container->get('language_manager'));
  }

  /**
   * {@inheritdoc}
   */
  public function getDerivativeDefinitions($base_plugin_definition): array {
    $this->derivatives = [];
    foreach (array_keys($this->languageManager->getLanguages()) as $langcode) {
      $this->derivatives[$langcode] = ['langcode' => $langcode] + $base_plugin_definition;
    }
    return $this->derivatives;
  }

}
