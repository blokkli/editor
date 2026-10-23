<?php

declare(strict_types=1);

namespace Drupal\blokkli_sandbox\Drush\Commands;

use Consolidation\OutputFormatters\StructuredData\RowsOfFields;
use Drupal\blokkli_sandbox\SandboxManager;
use Drush\Attributes as CLI;
use Drush\Commands\AutowireTrait;
use Drush\Commands\DrushCommands;
use Symfony\Component\HttpFoundation\RequestStack;

/**
 * Creates, deletes and lists the sandboxes.
 *
 * Run them on the default site (no --uri). A sandbox's URL is its id as a
 * subdomain of the default site's.
 */
final class SandboxCommands extends DrushCommands {

  use AutowireTrait;

  public function __construct(
    private readonly SandboxManager $sandboxManager,
    private readonly RequestStack $requestStack,
  ) {
    parent::__construct();
  }

  /**
   * Creates a sandbox from the template that `ddev bake` wrote.
   */
  #[CLI\Command(name: 'blokkli-sandbox:create')]
  #[CLI\Argument(name: 'id', description: 'Lowercase letters and digits, 2 to 32.')]
  #[CLI\Option(name: 'source', description: 'The template: the original language of its content (en, de or fr).')]
  #[CLI\Option(name: 'expires', description: 'When the control app deletes the sandbox at the latest, a Unix timestamp. Without it, the sandbox shows no banner.')]
  #[CLI\Option(name: 'idle', description: 'After how many seconds without use the control app deletes it earlier.')]
  #[CLI\Option(name: 'premium', description: 'A premium sandbox, with the agent (as from an invitation).')]
  #[CLI\Usage(name: 'drush blokkli-sandbox:create a1 --source=de', description: 'Create the sandbox a1 from the German template.')]
  #[CLI\Usage(name: 'drush blokkli-sandbox:create a1 --expires=1767225600 --idle=7200', description: 'Create a1 with the limits of a claimed sandbox, for its banner.')]
  #[CLI\Usage(name: 'drush blokkli-sandbox:create a1 --premium', description: 'Create a1 with the agent.')]
  public function createSandbox(
    string $id,
    array $options = [
      'source' => 'en',
      'expires' => NULL,
      'idle' => NULL,
      'premium' => FALSE,
    ],
  ): void {
    $this->sandboxManager->create(
      $id,
      (string) $options['source'],
      $options['expires'] === NULL ? NULL : (int) $options['expires'],
      $options['idle'] === NULL ? NULL : (int) $options['idle'],
      (bool) $options['premium'],
    );
    $this->logger()->success("Created the sandbox: {$this->url($id)}");
  }

  /**
   * Deletes a sandbox, with its database and files.
   */
  #[CLI\Command(name: 'blokkli-sandbox:delete')]
  #[CLI\Argument(name: 'id', description: 'The sandbox.')]
  #[CLI\Usage(name: 'drush blokkli-sandbox:delete a1', description: 'Delete the sandbox a1.')]
  public function deleteSandbox(string $id): void {
    $this->sandboxManager->delete($id);
    $this->logger()->success("Deleted the sandbox $id.");
  }

  /**
   * Copies a sandbox's database aside, so a failed update can be undone.
   */
  #[CLI\Command(name: 'blokkli-sandbox:snapshot')]
  #[CLI\Argument(name: 'id', description: 'The sandbox.')]
  #[CLI\Usage(name: 'drush blokkli-sandbox:snapshot a1', description: 'Snapshot the database of a1.')]
  public function snapshotSandbox(string $id): void {
    $this->sandboxManager->snapshot($id);
    $this->logger()->success("Wrote a snapshot of the sandbox $id.");
  }

  /**
   * Puts a sandbox's database back from the snapshot.
   */
  #[CLI\Command(name: 'blokkli-sandbox:restore')]
  #[CLI\Argument(name: 'id', description: 'The sandbox.')]
  #[CLI\Usage(name: 'drush blokkli-sandbox:restore a1', description: 'Restore the database of a1.')]
  public function restoreSandbox(string $id): void {
    $this->sandboxManager->restore($id);
    $this->logger()->success("Restored the database of the sandbox $id.");
  }

  /**
   * Deletes a sandbox's snapshot, after its update succeeded.
   */
  #[CLI\Command(name: 'blokkli-sandbox:discard-snapshot')]
  #[CLI\Argument(name: 'id', description: 'The sandbox.')]
  #[CLI\Usage(name: 'drush blokkli-sandbox:discard-snapshot a1', description: 'Discard the snapshot of a1.')]
  public function discardSnapshot(string $id): void {
    $this->sandboxManager->discardSnapshot($id);
    $this->logger()->success("Discarded the snapshot of the sandbox $id.");
  }

  /**
   * Lists the sandboxes.
   */
  #[CLI\Command(name: 'blokkli-sandbox:list')]
  #[CLI\FieldLabels(labels: ['id' => 'Id', 'url' => 'URL', 'premium' => 'Premium'])]
  #[CLI\Option(name: 'premium', description: 'Only the premium sandboxes.')]
  #[CLI\Usage(name: 'drush blokkli-sandbox:list --premium', description: 'List the premium sandboxes.')]
  public function listSandboxes(array $options = ['format' => 'table', 'premium' => FALSE]): RowsOfFields {
    $ids = $this->sandboxManager->list();
    if ($options['premium']) {
      $ids = array_values(array_filter(
        $ids,
        fn (string $id): bool => $this->sandboxManager->isPremium($id),
      ));
    }
    return new RowsOfFields(array_map(
      fn (string $id): array => [
        'id' => $id,
        'url' => $this->url($id),
        'premium' => $this->sandboxManager->isPremium($id) ? 'yes' : 'no',
      ],
      $ids,
    ));
  }

  /**
   * The sandbox's URL.
   */
  private function url(string $id): string {
    $request = $this->requestStack->getCurrentRequest();
    return $request ? $request->getScheme() . "://$id." . $request->getHttpHost() : $id;
  }

}
