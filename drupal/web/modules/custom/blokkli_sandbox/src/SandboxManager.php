<?php

declare(strict_types=1);

namespace Drupal\blokkli_sandbox;

use Drupal\Core\File\FileSystemInterface;
use Drupal\Core\Site\Settings;

/**
 * Creates, deletes and lists the sandboxes.
 *
 * A sandbox is a copy of a template that `ddev bake` writes: its database and
 * private and temporary files in drupal/sandboxes/<id>/, its public files in
 * sites/default/files/sandboxes/<id>/. settings.php picks it by the request's
 * subdomain, and nginx shows a page for a sandbox without a database.
 *
 * @see plans/drupal-setup/08-sandbox-routing.md
 */
final class SandboxManager {

  public function __construct(
    private readonly Settings $settings,
    private readonly FileSystemInterface $fileSystem,
  ) {}

  /**
   * Creates a sandbox from the template of a source language (e.g. "de").
   */
  public function create(string $id, string $source): void {
    $this->validate($id);
    $directory = $this->directory($id);
    if (is_dir($directory) || is_dir($this->publicDirectory($id))) {
      throw new \InvalidArgumentException("The sandbox '$id' exists already.");
    }
    $template = $this->setting('directory') . '/_template/' . $source;
    if (!preg_match('/^[a-z]{2}$/', $source) || !file_exists("$template/db.sqlite")) {
      throw new \InvalidArgumentException("There's no template for '$source': run ddev bake --source=$source.");
    }

    $this->copyDirectory("$template/files", $this->publicDirectory($id));
    foreach (['private', 'tmp'] as $subdirectory) {
      $this->fileSystem->mkdir("$directory/$subdirectory", NULL, TRUE);
    }
    // Last, and under another name first: a sandbox with a database is a
    // complete one for nginx and settings.php.
    if (!copy("$template/db.sqlite", "$directory/db.sqlite.tmp") || !rename("$directory/db.sqlite.tmp", "$directory/db.sqlite")) {
      throw new \RuntimeException("Couldn't copy the database of the sandbox '$id'.");
    }
  }

  /**
   * Deletes a sandbox: its database, then all its files.
   */
  public function delete(string $id): void {
    $this->validate($id);
    $directory = $this->directory($id);
    if (!is_dir($directory) && !is_dir($this->publicDirectory($id))) {
      throw new \InvalidArgumentException("There's no sandbox '$id'.");
    }
    // First: without its database, the sandbox is gone for requests.
    if (file_exists("$directory/db.sqlite")) {
      unlink("$directory/db.sqlite");
    }
    $this->fileSystem->deleteRecursive($directory);
    $this->fileSystem->deleteRecursive($this->publicDirectory($id));
  }

  /**
   * The ids of the sandboxes.
   *
   * @return string[]
   *   The ids, sorted.
   */
  public function list(): array {
    $directory = $this->setting('directory');
    $ids = array_filter(
      is_dir($directory) ? (scandir($directory) ?: []) : [],
      fn (string $id): bool => (bool) preg_match($this->setting('pattern'), $id) && is_dir("$directory/$id"),
    );
    return array_values($ids);
  }

  /**
   * Throws if the id isn't a valid one.
   */
  private function validate(string $id): void {
    if (!preg_match($this->setting('pattern'), $id)) {
      throw new \InvalidArgumentException("'$id' isn't a sandbox id: lowercase letters and digits, 2 to 32.");
    }
  }

  /**
   * The directory of a sandbox's database and private and temporary files.
   */
  private function directory(string $id): string {
    return $this->setting('directory') . '/' . $id;
  }

  /**
   * The directory of a sandbox's public files.
   */
  private function publicDirectory(string $id): string {
    return \DRUPAL_ROOT . '/' . $this->setting('public_directory') . '/' . $id;
  }

  /**
   * A path or the id pattern, from $settings['blokkli_sandbox'].
   */
  private function setting(string $key): string {
    $value = $this->settings->get('blokkli_sandbox')[$key] ?? NULL;
    if (!is_string($value)) {
      throw new \LogicException("settings.php has no \$settings['blokkli_sandbox']['$key'].");
    }
    return $value;
  }

  /**
   * Copies a directory recursively.
   */
  private function copyDirectory(string $source, string $target): void {
    $this->fileSystem->mkdir($target, NULL, TRUE);
    $items = new \RecursiveIteratorIterator(
      new \RecursiveDirectoryIterator($source, \FilesystemIterator::SKIP_DOTS),
      \RecursiveIteratorIterator::SELF_FIRST,
    );
    foreach ($items as $path => $item) {
      assert($item instanceof \SplFileInfo);
      $destination = $target . substr($path, strlen($source));
      if ($item->isDir()) {
        $this->fileSystem->mkdir($destination);
      }
      elseif (!copy($path, $destination)) {
        throw new \RuntimeException("Couldn't copy $path.");
      }
    }
  }

}
