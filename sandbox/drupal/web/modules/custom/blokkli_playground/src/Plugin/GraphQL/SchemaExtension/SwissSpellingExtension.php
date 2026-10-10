<?php

declare(strict_types=1);

namespace Drupal\blokkli_playground\Plugin\GraphQL\SchemaExtension;

use Drupal\blokkli_playground\GraphQL\SwissSpelling;
use Drupal\Core\Plugin\PluginBase;
use Drupal\Core\StringTranslation\TranslatableMarkup;
use Drupal\graphql\Attribute\SchemaExtension;
use Drupal\graphql\GraphQL\ResolverRegistryInterface;
use Drupal\graphql\Plugin\SchemaExtensionPluginInterface;
use GraphQL\Language\Source;

/**
 * Titles and leads with "ss" instead of "ß".
 *
 * Only resolvers, no schema: on the interfaces Paragraph and Node, the
 * resolvers apply to every paragraph and node type with the field.
 */
#[SchemaExtension(
  id: 'blokkli_playground_swiss_spelling',
  name: new TranslatableMarkup('blökkli playground: Swiss spelling'),
  schema: 'core_composable',
  description: new TranslatableMarkup('Titles and leads with "ss" instead of "ß".'),
)]
final class SwissSpellingExtension extends PluginBase implements SchemaExtensionPluginInterface {

  /**
   * {@inheritdoc}
   */
  public function registerResolvers(ResolverRegistryInterface $registry): void {
    $resolver = new SwissSpelling();
    foreach (['Paragraph', 'Node'] as $interface) {
      foreach (['fieldTitle', 'fieldLead'] as $field) {
        $registry->addFieldResolver($interface, $field, $resolver);
      }
    }
  }

  /**
   * {@inheritdoc}
   */
  public function getBaseDefinition(): ?Source {
    return NULL;
  }

  /**
   * {@inheritdoc}
   */
  public function getExtensionDefinition(): ?Source {
    return NULL;
  }

}
