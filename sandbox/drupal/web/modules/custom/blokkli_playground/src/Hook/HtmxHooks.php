<?php

declare(strict_types=1);

namespace Drupal\blokkli_playground\Hook;

use Drupal\Core\Hook\Attribute\Hook;

/**
 * Keeps core's htmx from adding a style element.
 *
 * The site's Content-Security-Policy (config/sync/csp.settings.yml:
 * style-src 'self') blocks the style element that htmx adds for its
 * indicators. Core doesn't use the indicator class, so it goes without them.
 * The meta tag is how htmx is configured before it runs.
 */
final class HtmxHooks {

  /**
   * Implements hook_page_attachments().
   */
  #[Hook('page_attachments')]
  public function pageAttachments(array &$attachments): void {
    $attachments['#attached']['html_head'][] = [
      [
        '#tag' => 'meta',
        '#attributes' => [
          'name' => 'htmx-config',
          'content' => '{"includeIndicatorStyles":false}',
        ],
      ],
      'blokkli_playground_htmx_config',
    ];
  }

}
