<?php

declare(strict_types=1);

namespace Drupal\blokkli_sandbox\Drush\Commands;

use Drupal\locale\LocaleProjectChecker;
use Drupal\locale\LocaleProjectRepository;
use Drupal\locale\LocaleSource;
use Drush\Attributes as CLI;
use Drush\Commands\AutowireTrait;
use Drush\Commands\DrushCommands;

/**
 * Checks a sandbox's translation files, for blokkli-sandbox:update.
 *
 * Unlike the other blokkli-sandbox commands, it runs on the sandbox's site
 * (--uri).
 */
final class SandboxTranslationCommands extends DrushCommands {

  use AutowireTrait;

  public function __construct(
    private readonly LocaleProjectRepository $projects,
    private readonly LocaleProjectChecker $checker,
    private readonly LocaleSource $sources,
  ) {
    parent::__construct();
  }

  /**
   * Checks the translation files on disk: locale:check without drupal.org.
   *
   * Then locale:update imports those whose content changed: the modules' own
   * files (their "interface translation server pattern"). drupal.org's came
   * with the template. locale:check would ask drupal.org about every project
   * (locale.settings: remote_and_local) and download into the sandbox's files.
   */
  #[CLI\Command(name: 'blokkli-sandbox:check-translations')]
  #[CLI\Usage(name: 'drush --uri=https://a1.blokkli.ddev.site blokkli-sandbox:check-translations', description: 'Check the translation files of the sandbox a1.')]
  public function checkTranslations(): void {
    // The projects of the code that runs now, and their files compared with
    // what was imported.
    $this->projects->deleteAll();
    $this->sources->clearSources();
    $this->checker->checkLocalProjects(array_keys($this->projects->getAll()));
    // locale:update imports what this found, instead of checking again.
    $this->sources->updateLastChecked();
  }

}
