<?php

declare(strict_types=1);

namespace Drupal\blokkli_sandbox\Controller;

use Drupal\blokkli_sandbox\LoginToken;
use Drupal\Core\Config\ConfigFactoryInterface;
use Drupal\Core\DependencyInjection\AutowireTrait;
use Drupal\Core\DependencyInjection\ContainerInjectionInterface;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Path\PathValidatorInterface;
use Drupal\Core\Routing\LocalRedirectResponse;
use Drupal\node\NodeInterface;
use Drupal\user\UserInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

/**
 * Logs a visitor into a sandbox, with a token (LoginToken).
 *
 * The control app makes them for its claims, Query.sandbox for the frontend's
 * banner: to come back, and for colleagues.
 */
final class SandboxLoginController implements ContainerInjectionInterface {

  use AutowireTrait;

  public function __construct(
    private readonly LoginToken $loginToken,
    private readonly EntityTypeManagerInterface $entityTypeManager,
    private readonly ConfigFactoryInterface $configFactory,
    private readonly PathValidatorInterface $pathValidator,
  ) {}

  /**
   * Logs the token's user in, then opens the front page's editor.
   *
   * A `destination` replaces the editor (core's RedirectResponseSubscriber):
   * the control app's claim opens the frontend's welcome page.
   */
  public function login(Request $request, string $token): LocalRedirectResponse {
    $account = $this->account($token);
    if (!$account) {
      throw new AccessDeniedHttpException();
    }
    user_login_finalize($account);
    // The check is for login forms: it would add ?check_logged_in=1 to the
    // editor's URL.
    $request->getSession()->remove('check_logged_in');
    return new LocalRedirectResponse($this->frontPageEditor());
  }

  /**
   * The token's user, if the token is valid for this sandbox.
   */
  private function account(string $token): ?UserInterface {
    $name = $this->loginToken->verify($token);
    if ($name === NULL) {
      return NULL;
    }
    $accounts = $this->entityTypeManager->getStorage('user')->loadByProperties(['name' => $name]);
    $account = reset($accounts);
    return $account instanceof UserInterface && $account->isActive() ? $account : NULL;
  }

  /**
   * The front page's editor, in the language of its original.
   */
  private function frontPageEditor(): string {
    $path = (string) $this->configFactory->get('system.site')->get('page.front');
    $url = $this->pathValidator->getUrlIfValidWithoutAccessCheck($path);
    $node_id = $url && $url->isRouted() ? ($url->getRouteParameters()['node'] ?? NULL) : NULL;
    $node = $node_id ? $this->entityTypeManager->getStorage('node')->load($node_id) : NULL;
    if (!$node instanceof NodeInterface) {
      return '/';
    }
    return '/' . $node->getUntranslated()->language()->getId() . '?blokkliEditing=' . $node->uuid();
  }

}
