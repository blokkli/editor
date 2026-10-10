<?php

declare(strict_types=1);

namespace Drupal\blokkli_playground\Plugin\GraphQL\DataProducer;

use Drupal\Core\Config\ConfigFactoryInterface;
use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Drupal\Core\Plugin\Context\ContextDefinition;
use Drupal\Core\StringTranslation\TranslatableMarkup;
use Drupal\crop\Entity\Crop;
use Drupal\file\FileInterface;
use Drupal\focal_point\FocalPointManagerInterface;
use Drupal\graphql\Attribute\DataProducer;
use Drupal\graphql\GraphQL\Execution\FieldContext;
use Drupal\graphql\Plugin\GraphQL\DataProducer\DataProducerPluginBase;
use Drupal\image\Plugin\Field\FieldType\ImageItem;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Returns an image's focal point, in percent.
 *
 * The focal_point module saves it as a crop of the image's file. A crop saved
 * later changes it, so the crops' list cache tag invalidates it.
 */
#[DataProducer(
  id: 'blokkli_playground_focal_point',
  name: new TranslatableMarkup('Focal point'),
  produces: new ContextDefinition(
    data_type: 'any',
    label: new TranslatableMarkup('The offsets from the left ("x") and top ("y")'),
  ),
  consumes: [
    'item' => new ContextDefinition(
      data_type: 'any',
      label: new TranslatableMarkup('The image field item'),
    ),
  ],
)]
final class FocalPoint extends DataProducerPluginBase implements ContainerFactoryPluginInterface {

  public function __construct(
    array $configuration,
    string $pluginId,
    mixed $pluginDefinition,
    protected readonly ConfigFactoryInterface $configFactory,
    protected readonly FocalPointManagerInterface $focalPointManager,
  ) {
    parent::__construct($configuration, $pluginId, $pluginDefinition);
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container, array $configuration, $plugin_id, $plugin_definition): static {
    return new static(
      $configuration,
      $plugin_id,
      $plugin_definition,
      $container->get('config.factory'),
      $container->get('focal_point.manager'),
    );
  }

  /**
   * Resolves the focal point.
   *
   * @return int[]|null
   *   The offsets "x" and "y", or NULL if the image has no focal point.
   */
  public function resolve(mixed $item, FieldContext $field): ?array {
    $config = $this->configFactory->get('focal_point.settings');
    $field->addCacheableDependency($config);
    $field->addCacheTags(['crop_list']);
    if (!$item instanceof ImageItem || !$item->entity instanceof FileInterface) {
      return NULL;
    }
    $width = (int) $item->get('width')->getValue();
    $height = (int) $item->get('height')->getValue();
    if (!$width || !$height) {
      return NULL;
    }

    $crop = Crop::findCrop($item->entity->getFileUri(), $config->get('crop_type'));
    if (!$crop) {
      return NULL;
    }
    return $this->focalPointManager->absoluteToRelative($crop->x->value, $crop->y->value, $width, $height);
  }

}
