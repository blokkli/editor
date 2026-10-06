<?php

declare(strict_types=1);

namespace Drupal\blokkli_sandbox;

use Drupal\Core\DependencyInjection\ContainerBuilder;
use Drupal\Core\DependencyInjection\ServiceProviderBase;

/**
 * Makes the session cookie host-only.
 *
 * By default Drupal sets it for ".<host>", so the browser also sends the
 * site's cookie to every sandbox under it (a1.blokkli.ddev.site). Without a
 * domain, a cookie only goes to its own host. Every host then uses the same
 * cookie name.
 */
final class BlokkliSandboxServiceProvider extends ServiceProviderBase {

  /**
   * {@inheritdoc}
   */
  public function alter(ContainerBuilder $container): void {
    $options = $container->getParameter('session.storage.options');
    // Empty, not unset: Drupal derives an unset domain from the host.
    $options['cookie_domain'] = '';
    $container->setParameter('session.storage.options', $options);
  }

}
