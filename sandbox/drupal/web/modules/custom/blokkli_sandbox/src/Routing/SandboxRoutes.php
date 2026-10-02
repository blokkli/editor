<?php

declare(strict_types=1);

namespace Drupal\blokkli_sandbox\Routing;

use Drupal\Core\DependencyInjection\AutowireTrait;
use Drupal\Core\DependencyInjection\ContainerInjectionInterface;
use Drupal\Core\Site\Settings;
use Symfony\Component\Routing\Route;

/**
 * The sandboxes' image style derivatives.
 *
 * Core's route (image.style_public) has the public files path of when the
 * router was built: in a new sandbox, the default site's, which the template
 * was baked on. This one takes every sandbox's, so that a new sandbox's router
 * needn't be rebuilt. After a rebuild, core's route matches first.
 *
 * @see \Drupal\image\Routing\ImageStyleRoutes::routes()
 */
final class SandboxRoutes implements ContainerInjectionInterface {

  use AutowireTrait;

  public function __construct(
    private readonly Settings $settings,
  ) {}

  /**
   * Returns the route.
   *
   * @return \Symfony\Component\Routing\Route[]
   *   The route, by name.
   */
  public function routes(): array {
    $directory = $this->settings->get('blokkli_sandbox')['public_directory'] ?? NULL;
    if (!is_string($directory)) {
      return [];
    }
    return [
      'blokkli_sandbox.image_style' => new Route(
        "/$directory/{sandbox}/styles/{image_style}/{scheme}",
        [
          '_controller' => 'Drupal\image\Controller\ImageStyleDownloadController::deliver',
          'required_derivative_scheme' => 'public',
        ],
        ['_access' => 'TRUE'],
      ),
    ];
  }

}
