<?php

declare(strict_types=1);

namespace Drupal\blokkli_playground\Plugin\ParagraphsBlokkli\Conversion;

use Drupal\Component\Utility\Html;
use Drupal\Component\Utility\Unicode;
use Drupal\Core\StringTranslation\TranslatableMarkup;
use Drupal\paragraphs\ParagraphInterface;
use Drupal\paragraphs_blokkli\ParagraphMutationContextInterface;
use Drupal\paragraphs_blokkli_conversion\Attribute\ParagraphConversion;
use Drupal\paragraphs_blokkli_conversion\ParagraphConversionPluginBase;

/**
 * Converts a text to a title: its text, without the markup.
 */
#[ParagraphConversion(
  id: 'text_to_title',
  title: new TranslatableMarkup('Convert a text to a title'),
  source_bundle: 'text',
  target_bundle: 'title',
)]
final class TextToTitle extends ParagraphConversionPluginBase {

  /**
   * {@inheritdoc}
   */
  public function convert(ParagraphInterface $paragraph, ParagraphMutationContextInterface $context): array {
    $markup = (string) $paragraph->get('field_text')->value;
    // A space after each block, so that paragraphs don't run together.
    $text = strip_tags((string) preg_replace('#</(p|h[1-6]|li|dt|dd|blockquote)>#i', ' ', $markup));
    $title = trim((string) preg_replace('/\s+/u', ' ', Html::decodeEntities($text)));

    return [
      'field_title' => Unicode::truncate($title, 255, TRUE, TRUE),
    ];
  }

}
