<?php

/**
 * @file
 * Settings for the blökkli playground site. See plans/drupal-setup/.
 *
 * Secrets come from the environment: .ddev/.env.web, see .ddev/config.yaml.
 */

use Symfony\Component\HttpFoundation\Request;

// The site's database, private files and hash salt. The sandbox include
// (chunk 08) replaces these with the ones of the sandbox the Host names.
$databases['default']['default'] = [
  'driver' => 'sqlite',
  'database' => dirname($app_root) . '/db/site.sqlite',
  'namespace' => 'Drupal\\sqlite\\Driver\\Database\\sqlite',
  'autoload' => 'core/modules/sqlite/src/Driver/Database/sqlite/',
  // Safe with WAL (Drupal's default): a power loss can lose the last commits,
  // but it can't corrupt the database.
  'init_commands' => ['synchronous' => 'PRAGMA synchronous=NORMAL'],
];
$settings['file_private_path'] = dirname($app_root) . '/private';
// Public, so the hosted site must set its own (see the guard at the end).
$settings['hash_salt'] = getenv('DRUPAL_HASH_SALT') ?: 'blokkli-local-development';

// With the persistent entity cache, concurrent reads and writes on SQLite lose
// edits (plans/drupal-setup/01-sqlite-spike.md).
$settings['cache']['bins']['entity'] = 'cache.backend.memory';

$settings['config_sync_directory'] = dirname($app_root) . '/config/sync';
$settings['file_temp_path'] = '/tmp';

// ddev's hostnames for this project, comma-separated.
$settings['trusted_host_patterns'] = array_map(
  fn (string $host): string => '^' . preg_quote($host) . '$',
  explode(',', (string) getenv('DDEV_HOSTNAME')),
);

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
// drupal/paragraphs_blokkli), which would expose a second copy of core.
$settings['file_scan_ignore_directories'] = ['node_modules', 'bower_components', 'web'];

// Empty turns the feature off.
$config['paragraphs_blokkli_agent.settings']['auth_secret'] = getenv('NUXT_BLOKKLI_AGENT_AUTH_SECRET') ?: '';
$config['paragraphs_blokkli_deepl.settings']['api_key'] = getenv('DEEPL_AUTH_KEY') ?: '';

if (file_exists($app_root . '/' . $site_path . '/settings.local.php')) {
  include $app_root . '/' . $site_path . '/settings.local.php';
}

// With the public salt, anyone could forge one-time login links.
if (getenv('IS_DDEV_HOSTED') === 'true' && !getenv('DRUPAL_HASH_SALT')) {
  throw new \RuntimeException('DRUPAL_HASH_SALT must be set on the hosted site (.ddev/.env.web).');
}
