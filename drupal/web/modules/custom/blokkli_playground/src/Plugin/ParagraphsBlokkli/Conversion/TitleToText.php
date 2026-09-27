<?php

declare(strict_types=1);

namespace Drupal\blokkli_playground\Plugin\ParagraphsBlokkli\Conversion;

use Drupal\Component\Utility\Html;
use Drupal\Core\StringTranslation\TranslatableMarkup;
use Drupal\paragraphs\ParagraphInterface;
use Drupal\paragraphs_blokkli\ParagraphMutationContextInterface;
use Drupal\paragraphs_blokkli_conversion\Attribute\ParagraphConversion;
use Drupal\paragraphs_blokkli_conversion\ParagraphConversionPluginBase;

/**
 * Converts a title to a text that starts with the title as its heading.
 */
#[ParagraphConversion(
  id: 'title_to_text',
  title: new TranslatableMarkup('Convert a title to a text'),
  source_bundle: 'title',
  target_bundle: 'text',
)]
final class TitleToText extends ParagraphConversionPluginBase {

  /**
   * {@inheritdoc}
   */
  public function convert(ParagraphInterface $paragraph, ParagraphMutationContextInterface $context): array {
    $title = trim((string) $paragraph->get('field_title')->value);

    return [
      'field_text' => [
        'value' => $title === '' ? '' : '<h2>' . Html::escape($title) . '</h2>',
        'format' => 'basic_html',
      ],
    ];
  }

}
