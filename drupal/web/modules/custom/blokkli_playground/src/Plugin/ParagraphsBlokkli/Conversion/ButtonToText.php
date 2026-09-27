<?php

declare(strict_types=1);

namespace Drupal\blokkli_playground\Plugin\ParagraphsBlokkli\Conversion;

use Drupal\Component\Utility\Html;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\File\FileUrlGeneratorInterface;
use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Drupal\Core\StringTranslation\TranslatableMarkup;
use Drupal\Core\Url;
use Drupal\file\FileInterface;
use Drupal\link\LinkItemInterface;
use Drupal\media\MediaInterface;
use Drupal\paragraphs\ParagraphInterface;
use Drupal\paragraphs_blokkli\ParagraphMutationContextInterface;
use Drupal\paragraphs_blokkli_conversion\Attribute\ParagraphConversion;
use Drupal\paragraphs_blokkli_conversion\ParagraphConversionPluginBase;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Converts a button to a text with the button's link.
 */
#[ParagraphConversion(
  id: 'button_to_text',
  title: new TranslatableMarkup('Convert a button to a text'),
  source_bundle: 'button',
  target_bundle: 'text',
)]
final class ButtonToText extends ParagraphConversionPluginBase implements ContainerFactoryPluginInterface {

  public function __construct(
    array $configuration,
    $plugin_id,
    $plugin_definition,
    private readonly EntityTypeManagerInterface $entityTypeManager,
    private readonly FileUrlGeneratorInterface $fileUrlGenerator,
  ) {
    parent::__construct($configuration, $plugin_id, $plugin_definition);
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container, array $configuration, $plugin_id, $plugin_definition): static {
    return new static(
      $configuration,
      $plugin_id,
      $plugin_definition,
      $container->get('entity_type.manager'),
      $container->get('file_url_generator'),
    );
  }

  /**
   * {@inheritdoc}
   */
  public function convert(ParagraphInterface $paragraph, ParagraphMutationContextInterface $context): array {
    $label = trim((string) $paragraph->get('field_title')->value);
    $link = $paragraph->get('field_link')->first();
    $url = $link instanceof LinkItemInterface && !$link->isEmpty() ? $link->getUrl() : NULL;
    // convert() runs once per translation: each links to its language's path.
    $href = $url ? $this->getHref($url->setOption('language', $paragraph->language())) : NULL;

    $text = Html::escape($label !== '' ? $label : ($href ?? ''));
    if ($href !== NULL) {
      $text = '<a href="' . Html::escape($href) . '">' . $text . '</a>';
    }

    return [
      'field_text' => [
        'value' => $text === '' ? '' : '<p>' . $text . '</p>',
        'format' => 'basic_html',
      ],
    ];
  }

  /**
   * The link's URL; a document's is its file, as in the button block.
   */
  private function getHref(Url $url): string {
    if ($url->isRouted() && $url->getRouteName() === 'entity.media.canonical') {
      $media = $this->entityTypeManager->getStorage('media')->load($url->getRouteParameters()['media'] ?? 0);
      if ($media instanceof MediaInterface) {
        $fid = $media->getSource()->getSourceFieldValue($media);
        $file = $fid ? $this->entityTypeManager->getStorage('file')->load($fid) : NULL;
        if ($file instanceof FileInterface) {
          return $this->fileUrlGenerator->generateString((string) $file->getFileUri());
        }
      }
    }
    return $url->toString(TRUE)->getGeneratedUrl();
  }

}
