<?php

declare(strict_types=1);

namespace Drupal\blokkli_playground\Plugin\GraphQL\SchemaExtension;

use Drupal\Core\StringTranslation\TranslatableMarkup;
use Drupal\graphql\Attribute\SchemaExtension;
use Drupal\graphql\GraphQL\ResolverBuilder;
use Drupal\graphql\GraphQL\ResolverRegistryInterface;
use Drupal\graphql\Plugin\GraphQL\SchemaExtension\SdlSchemaExtensionPluginBase;

/**
 * The site search: Query.search.
 *
 * SearchResult's fields need no resolvers: graphql_core_schema's default
 * resolver reads them from the producer's array, and checks the access to
 * and translates the nodes.
 */
#[SchemaExtension(
  id: 'blokkli_playground_search',
  name: new TranslatableMarkup('blökkli playground: search'),
  schema: 'core_composable',
  description: new TranslatableMarkup('The site search, over the Search API index "content".'),
)]
final class SearchExtension extends SdlSchemaExtensionPluginBase {

  /**
   * {@inheritdoc}
   */
  public function registerResolvers(ResolverRegistryInterface $registry): void {
    $builder = new ResolverBuilder();
    $registry->addFieldResolver('Query', 'search',
      $builder->produce('blokkli_playground_search')
        ->map('text', $builder->fromArgument('text'))
        ->map('offset', $builder->fromArgument('offset'))
        ->map('limit', $builder->fromArgument('limit'))
        ->map('langcode', $builder->produce('current_language'))
    );
  }

}
