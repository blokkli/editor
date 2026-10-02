<?php

declare(strict_types=1);

namespace Drupal\blokkli_sandbox\Controller;

use Drupal\Component\Datetime\TimeInterface;
use Drupal\Core\Config\ConfigFactoryInterface;
use Drupal\Core\DependencyInjection\AutowireTrait;
use Drupal\Core\DependencyInjection\ContainerInjectionInterface;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Path\PathValidatorInterface;
use Drupal\Core\Routing\LocalRedirectResponse;
use Drupal\Core\Site\Settings;
use Drupal\node\NodeInterface;
use Drupal\user\UserInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

/**
 * Logs a visitor into a sandbox, with a token from the control app.
 *
 * The token is "<payload>.<signature>": the payload is base64url-encoded JSON
 * with the sandbox's id, the user's name and the expiry (a Unix timestamp),
 * the signature its HMAC-SHA256 with the login secret, base64url-encoded too.
 * The control app makes them (sandbox/control/server/utils/loginToken.ts).
 *
 * @see plans/drupal-setup/09-control-plane.md
 */
final class SandboxLoginController implements ContainerInjectionInterface {

  use AutowireTrait;

  public function __construct(
    private readonly Settings $settings,
    private readonly EntityTypeManagerInterface $entityTypeManager,
    private readonly ConfigFactoryInterface $configFactory,
    private readonly PathValidatorInterface $pathValidator,
    private readonly TimeInterface $time,
  ) {}

  /**
   * Logs the token's user in, then opens the front page's editor.
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
    $settings = $this->settings->get('blokkli_sandbox');
    // Only in a sandbox: settings.php sets the id.
    $id = $settings['id'] ?? NULL;
    $secret = $settings['login_secret'] ?? NULL;
    if (!is_string($id) || !is_string($secret)) {
      return NULL;
    }
    [$payload, $signature] = explode('.', $token, 2) + ['', ''];
    $expected = rtrim(strtr(base64_encode(hash_hmac('sha256', $payload, $secret, TRUE)), '+/', '-_'), '=');
    if (!hash_equals($expected, $signature)) {
      return NULL;
    }
    $data = json_decode((string) base64_decode(strtr($payload, '-_', '+/')), TRUE);
    if (!is_array($data) || ($data['sandbox'] ?? NULL) !== $id || !is_int($data['expires'] ?? NULL) || $data['expires'] < $this->time->getRequestTime() || !is_string($data['user'] ?? NULL)) {
      return NULL;
    }
    $accounts = $this->entityTypeManager->getStorage('user')->loadByProperties(['name' => $data['user']]);
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
