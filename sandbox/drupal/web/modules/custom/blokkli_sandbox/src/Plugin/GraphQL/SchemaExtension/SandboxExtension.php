<?php

declare(strict_types=1);

namespace Drupal\blokkli_sandbox\Plugin\GraphQL\SchemaExtension;

use Drupal\Core\StringTranslation\TranslatableMarkup;
use Drupal\graphql\Attribute\SchemaExtension;
use Drupal\graphql\GraphQL\ResolverBuilder;
use Drupal\graphql\GraphQL\ResolverRegistryInterface;
use Drupal\graphql\Plugin\GraphQL\SchemaExtension\SdlSchemaExtensionPluginBase;

/**
 * The current sandbox: Query.sandbox, for the frontend's banner.
 *
 * Sandbox's and SandboxLogin's fields need no resolvers: graphql_core_schema's
 * default resolver reads them from the producer's array.
 */
#[SchemaExtension(
  id: 'blokkli_sandbox',
  name: new TranslatableMarkup('blökkli sandbox'),
  schema: 'core_composable',
  description: new TranslatableMarkup('The current sandbox: when it is deleted, and the links that log its users in.'),
)]
final class SandboxExtension extends SdlSchemaExtensionPluginBase {

  /**
   * {@inheritdoc}
   */
  public function registerResolvers(ResolverRegistryInterface $registry): void {
    $builder = new ResolverBuilder();
    $registry->addFieldResolver('Query', 'sandbox', $builder->produce('blokkli_sandbox'));
  }

}
