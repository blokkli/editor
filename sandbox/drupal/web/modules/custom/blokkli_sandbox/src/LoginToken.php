<?php

declare(strict_types=1);

namespace Drupal\blokkli_sandbox;

use Drupal\Component\Datetime\TimeInterface;
use Drupal\Core\Site\Settings;

/**
 * Makes and checks the tokens that log a user into a sandbox.
 *
 * The token is "<payload>.<signature>": the payload is base64url-encoded JSON
 * with the sandbox's id, the user's name and the expiry (a Unix timestamp),
 * the signature its HMAC-SHA256 with the login secret, base64url-encoded too.
 * The control app makes them as well (sandbox/control/server/utils/
 * loginToken.ts). Only in a sandbox: settings.php sets its id.
 */
final class LoginToken {

  public function __construct(
    private readonly Settings $settings,
    private readonly TimeInterface $time,
  ) {}

  /**
   * A token that logs a user into this sandbox until $expires.
   */
  public function create(string $user, int $expires): ?string {
    [$id, $secret] = $this->sandbox();
    if ($id === NULL || $secret === NULL) {
      return NULL;
    }
    $payload = $this->base64url(json_encode(['sandbox' => $id, 'user' => $user, 'expires' => $expires], JSON_THROW_ON_ERROR));
    return $payload . '.' . $this->sign($payload, $secret);
  }

  /**
   * The name of the token's user, if the token is valid for this sandbox.
   */
  public function verify(string $token): ?string {
    [$id, $secret] = $this->sandbox();
    if ($id === NULL || $secret === NULL) {
      return NULL;
    }
    [$payload, $signature] = explode('.', $token, 2) + ['', ''];
    if (!hash_equals($this->sign($payload, $secret), $signature)) {
      return NULL;
    }
    $data = json_decode((string) base64_decode(strtr($payload, '-_', '+/')), TRUE);
    if (!is_array($data) || ($data['sandbox'] ?? NULL) !== $id || !is_int($data['expires'] ?? NULL) || $data['expires'] < $this->time->getRequestTime() || !is_string($data['user'] ?? NULL)) {
      return NULL;
    }
    return $data['user'];
  }

  /**
   * The sandbox's id and the login secret, from settings.php.
   *
   * @return array{0: ?string, 1: ?string}
   *   NULLs outside a sandbox.
   */
  private function sandbox(): array {
    $settings = $this->settings->get('blokkli_sandbox');
    $id = $settings['id'] ?? NULL;
    $secret = $settings['login_secret'] ?? NULL;
    return [is_string($id) ? $id : NULL, is_string($secret) ? $secret : NULL];
  }

  /**
   * The payload's signature.
   */
  private function sign(string $payload, string $secret): string {
    return $this->base64url(hash_hmac('sha256', $payload, $secret, TRUE));
  }

  /**
   * Base64url without padding, like Node's "base64url".
   */
  private function base64url(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
  }

}
