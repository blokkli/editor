<?php

declare(strict_types=1);

namespace Drupal\blokkli_playground\Hook;

use Drupal\Component\Datetime\TimeInterface;
use Drupal\Core\Datetime\DrupalDateTime;
use Drupal\Core\Hook\Attribute\Hook;
use Drupal\node\NodeInterface;

/**
 * Unpublishes events after their date.
 *
 * The hook sets scheduler's unpublish date from the event's end, and
 * scheduler's cron unpublishes the event. The event form doesn't show the
 * unpublish date.
 */
final class EventHooks {

  public function __construct(
    private readonly TimeInterface $time,
  ) {}

  /**
   * Implements hook_node_presave().
   */
  #[Hook('node_presave')]
  public function nodePresave(NodeInterface $node): void {
    if ($node->bundle() !== 'event' || !$node->hasField('unpublish_on')) {
      return;
    }

    $date = $node->get('field_date')->first();
    $end = $date?->end_date ?? $date?->start_date;
    if (!$end instanceof DrupalDateTime) {
      return;
    }

    // Past dates are left alone. Scheduler's cron unpublishes one translation
    // at a time and clears its date, so the others still need theirs. And an
    // event published again after its date has no date left to act on.
    $timestamp = $end->getTimestamp();
    if ($timestamp <= $this->time->getCurrentTime()) {
      return;
    }

    // The event's date is the same in every language, the unpublish date is
    // per translation.
    foreach (array_keys($node->getTranslationLanguages()) as $langcode) {
      $node->getTranslation($langcode)->set('unpublish_on', $timestamp);
    }
  }

}
