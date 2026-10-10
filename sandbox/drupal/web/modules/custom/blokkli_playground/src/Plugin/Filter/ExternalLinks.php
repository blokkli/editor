<?php

declare(strict_types=1);

namespace Drupal\blokkli_playground\Plugin\Filter;

use Drupal\Component\Utility\Html;
use Drupal\Core\StringTranslation\TranslatableMarkup;
use Drupal\filter\Attribute\Filter;
use Drupal\filter\FilterProcessResult;
use Drupal\filter\Plugin\FilterBase;
use Drupal\filter\Plugin\FilterInterface;

/**
 * Opens links to other sites in a new tab, and says so.
 *
 * Each http(s) link gets target="_blank", followed by a visually hidden
 * "(opens in a new tab)" for screen readers. It runs after filter_html, which
 * would remove both.
 */
#[Filter(
  id: 'blokkli_playground_external_links',
  title: new TranslatableMarkup('Open external links in a new tab'),
  type: FilterInterface::TYPE_TRANSFORM_IRREVERSIBLE,
  weight: 10,
)]
final class ExternalLinks extends FilterBase {

  /**
   * {@inheritdoc}
   */
  public function process($text, $langcode): FilterProcessResult {
    $result = new FilterProcessResult($text);
    if (stripos($text, '<a') === FALSE) {
      return $result;
    }

    $dom = Html::load($text);
    foreach ($dom->getElementsByTagName('a') as $link) {
      $scheme = parse_url($link->getAttribute('href'), PHP_URL_SCHEME);
      if (!in_array($scheme, ['http', 'https'], TRUE)) {
        continue;
      }
      $link->setAttribute('target', '_blank');
      $hint = $dom->createElement('span');
      $hint->setAttribute('class', 'visually-hidden');
      $hint->textContent = ' ' . $this->t('(opens in a new tab)', [], ['langcode' => $langcode]);
      $link->parentNode?->insertBefore($hint, $link->nextSibling);
    }

    return $result->setProcessedText(Html::serialize($dom));
  }

}
