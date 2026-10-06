<?php

/**
 * @file
 * Settings for the blökkli playground site. See plans/drupal-setup/.
 *
 * Secrets come from the environment: .ddev/.env.web, see .ddev/config.yaml.
 */

use Symfony\Component\HttpFoundation\Request;

// Sandboxes (plans/drupal-setup/08-sandbox-routing.md): a subdomain of a
// wildcard hostname in DDEV_HOSTNAME (*.blokkli.ddev.site) names a sandbox, a
// copy of a template made by the blokkli_sandbox module. It has its own
// database, files and hash salt. Without a subdomain, this is the default site:
// the dev site locally, only the bake target when hosted.
$settings['blokkli_sandbox'] = [
  // Their databases, private and temporary files, and the templates.
  'directory' => dirname($app_root) . '/sandboxes',
  // Their public files, relative to the web root.
  'public_directory' => 'sites/default/files/sandboxes',
  // A path segment and a DNS label. nginx has the same pattern.
  'pattern' => '/^[a-z0-9]{2,32}$/',
  // Signs the logins that the control app (sandbox/control) hands out. Public,
  // so the hosted site must set its own (see the guard at the end).
  'login_secret' => getenv('NUXT_SANDBOX_LOGIN_SECRET') ?: 'blokkli-local-development',
  // What a sandbox's users can upload together, in bytes
  // (plans/drupal-setup/10-access-and-guardrails.md).
  'upload_quota' => 100 * 1024 * 1024,
];
$hostnames = explode(',', (string) getenv('DDEV_HOSTNAME'));
$host = strtolower((string) preg_replace('/:\d+$/', '', $_SERVER['HTTP_HOST'] ?? ''));
$sandbox = NULL;
foreach ($hostnames as $hostname) {
  $suffix = substr($hostname, 1);
  if (str_starts_with($hostname, '*.') && str_ends_with($host, $suffix)) {
    $sandbox = substr($host, 0, -strlen($suffix));
  }
}
// Public, so the hosted site must set its own (see the guard at the end).
$salt = getenv('DRUPAL_HASH_SALT') ?: 'blokkli-local-development';

if ($sandbox === NULL) {
  $database = dirname($app_root) . '/db/site.sqlite';
  $settings['file_private_path'] = dirname($app_root) . '/private';
  $settings['file_temp_path'] = '/tmp';
  $settings['hash_salt'] = $salt;
  // ddev's hostnames for this project, without the sandboxes' wildcards.
  $settings['trusted_host_patterns'] = array_map(
    fn (string $hostname): string => '^' . preg_quote($hostname) . '$',
    array_filter($hostnames, fn (string $hostname): bool => !str_starts_with($hostname, '*.')),
  );
  $agent = TRUE;
}
else {
  $directory = $settings['blokkli_sandbox']['directory'] . '/' . $sandbox;
  // nginx shows visitors a page for a sandbox that doesn't exist (any more).
  // This guards drush and the rest: SQLite would create an empty database.
  if (!preg_match($settings['blokkli_sandbox']['pattern'], $sandbox) || !file_exists("$directory/db.sqlite")) {
    throw new \RuntimeException("There's no sandbox '$sandbox'.");
  }
  $settings['blokkli_sandbox']['id'] = $sandbox;
  $database = "$directory/db.sqlite";
  $settings['file_public_path'] = $settings['blokkli_sandbox']['public_directory'] . '/' . $sandbox;
  $settings['file_private_path'] = "$directory/private";
  $settings['file_temp_path'] = "$directory/tmp";
  // Its own salt: its login links, form tokens and image style tokens don't
  // work on another site.
  $settings['hash_salt'] = hash_hmac('sha256', $sandbox, $salt);
  $settings['trusted_host_patterns'] = ['^' . preg_quote($host) . '$'];
  // The default site's compiled Twig and CSS/JS aggregates: they depend only on
  // the code. Twig's secret names the files, and would be the sandbox's salt.
  $settings['php_storage']['twig'] = [
    'directory' => $app_root . '/sites/default/files/php',
    'secret' => $salt,
  ];
  $settings['file_assets_path'] = 'sites/default/files';
  // The bins on core's chained fast backend (core.services.yml), without APCu:
  // it would grow with every sandbox, and the prefix is shared (see
  // apcu_ensure_unique_prefix below).
  foreach (['bootstrap', 'config', 'discovery', 'routes'] as $bin) {
    $settings['cache']['bins'][$bin] = 'cache.backend.database';
  }
  // GraphQL errors without messages and traces for the visitors.
  $config['graphql.graphql_servers.graphql']['debug_flag'] = 0;
  // Only premium sandboxes (an invitation's) get the agent, see its secret
  // below. blokkli-sandbox:create writes the file (SandboxManager::create()).
  $lifetime = file_exists("$directory/lifetime.json") ? json_decode((string) file_get_contents("$directory/lifetime.json"), TRUE) : NULL;
  $agent = ($lifetime['premium'] ?? FALSE) === TRUE;
}
// APCu's prefixes without the hash salt: the class loader and the file cache
// depend only on the code, so every site shares one copy. Only the default
// site keeps cache bins in APCu.
$settings['apcu_ensure_unique_prefix'] = FALSE;

$databases['default']['default'] = [
  'driver' => 'sqlite',
  'database' => $database,
  'namespace' => 'Drupal\\sqlite\\Driver\\Database\\sqlite',
  'autoload' => 'core/modules/sqlite/src/Driver/Database/sqlite/',
  // Safe with WAL (Drupal's default): a power loss can lose the last commits,
  // but it can't corrupt the database.
  'init_commands' => ['synchronous' => 'PRAGMA synchronous=NORMAL'],
];

// With the persistent entity cache, concurrent reads and writes on SQLite lose
// edits (plans/drupal-setup/01-sqlite-spike.md).
$settings['cache']['bins']['entity'] = 'cache.backend.memory';

$settings['config_sync_directory'] = dirname($app_root) . '/config/sync';

// Requests come through ddev's router and this container's nginx, both on
// private networks. Only the X-Forwarded headers they set are trusted: a
// client's own "Forwarded" header would conflict with them.
$settings['reverse_proxy'] = TRUE;
$settings['reverse_proxy_addresses'] = ['PRIVATE_SUBNETS'];
$settings['reverse_proxy_trusted_headers'] = Request::HEADER_X_FORWARDED_FOR | Request::HEADER_X_FORWARDED_HOST | Request::HEADER_X_FORWARDED_PROTO;

// This file is tracked, so sites/default must stay writable.
$settings['skip_permissions_hardening'] = TRUE;
$settings['update_free_access'] = FALSE;
$settings['entity_update_batch_size'] = 50;
// "web": the test site a module checkout builds for itself (see the README of
// sandbox/drupal/paragraphs_blokkli), which would expose a second copy of
// core.
$settings['file_scan_ignore_directories'] = ['node_modules', 'bower_components', 'web'];

// Empty turns the feature off, and the editor hides it. Without the agent's
// secret, Drupal makes no tokens, so the agent server lets nobody in from a
// sandbox that isn't premium.
$config['paragraphs_blokkli_agent.settings']['auth_secret'] = $agent ? (getenv('NUXT_BLOKKLI_AGENT_AUTH_SECRET') ?: '') : '';
$config['paragraphs_blokkli_deepl.settings']['api_key'] = getenv('DEEPL_AUTH_KEY') ?: '';

if (file_exists($app_root . '/' . $site_path . '/settings.local.php')) {
  include $app_root . '/' . $site_path . '/settings.local.php';
}
// Sandboxes stay private, whatever settings.local.php says (see
// AnonymousViewerAccessPolicy).
if ($sandbox !== NULL) {
  unset($settings['blokkli_playground_public']);
}

// With the public salt or login secret, anyone could forge login links.
foreach (['DRUPAL_HASH_SALT', 'NUXT_SANDBOX_LOGIN_SECRET'] as $variable) {
  if (getenv('IS_DDEV_HOSTED') === 'true' && !getenv($variable)) {
    throw new \RuntimeException("$variable must be set on the hosted site (.ddev/.env.web).");
  }
}
