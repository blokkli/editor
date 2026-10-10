<?php

declare(strict_types=1);

namespace Drupal\blokkli_playground\Plugin\GraphQL\SchemaExtension;

use Drupal\Core\StringTranslation\TranslatableMarkup;
use Drupal\graphql\Attribute\SchemaExtension;
use Drupal\graphql\GraphQL\ResolverBuilder;
use Drupal\graphql\GraphQL\ResolverRegistryInterface;
use Drupal\graphql\Plugin\GraphQL\SchemaExtension\SdlSchemaExtensionPluginBase;

/**
 * The focal points of images: FieldItemTypeImage.focalPoint.
 *
 * The frontend crops images with CSS, around their focal point. ImageFocalPoint
 * needs no resolvers: graphql_core_schema's default resolver reads its fields
 * from the producer's array.
 */
#[SchemaExtension(
  id: 'blokkli_playground_focal_point',
  name: new TranslatableMarkup('blökkli playground: focal points'),
  schema: 'core_composable',
  description: new TranslatableMarkup('The focal points of images, set with the focal_point module.'),
)]
final class FocalPointExtension extends SdlSchemaExtensionPluginBase {

  /**
   * {@inheritdoc}
   */
  public function registerResolvers(ResolverRegistryInterface $registry): void {
    $builder = new ResolverBuilder();
    $registry->addFieldResolver('FieldItemTypeImage', 'focalPoint',
      $builder->produce('blokkli_playground_focal_point')
        ->map('item', $builder->fromParent())
    );
  }

}
