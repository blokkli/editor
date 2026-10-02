<?php

declare(strict_types=1);

namespace Drupal\blokkli_sandbox\EventSubscriber;

use Drupal\Core\Site\Settings;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpKernel\KernelEvents;

/**
 * Records when a sandbox was last used: the mtime of its file "last-use".
 *
 * At most once a minute, after the response. The control app deletes a
 * sandbox that hasn't been used for a while (sandbox/control, its cleanup
 * task).
 */
final class LastUseSubscriber implements EventSubscriberInterface {

  public function __construct(
    private readonly Settings $settings,
  ) {}

  /**
   * {@inheritdoc}
   */
  public static function getSubscribedEvents(): array {
    return [KernelEvents::TERMINATE => 'touch'];
  }

  /**
   * Touches the file, in a sandbox, when it's older than a minute.
   */
  public function touch(): void {
    $settings = $this->settings->get('blokkli_sandbox');
    if (!isset($settings['id'], $settings['directory'])) {
      return;
    }
    $file = $settings['directory'] . '/' . $settings['id'] . '/last-use';
    if (!file_exists($file) || filemtime($file) < time() - 60) {
      touch($file);
    }
  }

}
