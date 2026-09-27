<?php

declare(strict_types=1);

namespace Drupal\blokkli_playground\Routing;

use Drupal\Core\Routing\RouteSubscriberBase;
use Symfony\Component\Routing\RouteCollection;

/**
 * Moves the config pages' canonical route to the frontend.
 */
final class RouteSubscriber extends RouteSubscriberBase {

  /**
   * {@inheritdoc}
   */
  protected function alterRoutes(RouteCollection $collection): void {
    // blökkli links to a host's canonical URL: to start editing, to switch
    // the language and for previews. The default path is under /admin, which
    // Drupal serves. The frontend renders config pages at this path instead,
    // like paragraphs_library's library items.
    $route = $collection->get('entity.translatable_config_pages.canonical');
    $route?->setPath('/blokkli/config-page/{translatable_config_pages}');
  }

}
