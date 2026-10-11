<?php

declare(strict_types=1);

namespace Drupal\blokkli_playground\Hook;

use Drupal\Core\Form\FormStateInterface;
use Drupal\Core\Hook\Attribute\Hook;
use Drupal\Core\StringTranslation\StringTranslationTrait;

/**
 * Gives media forms a field that depends on another, through "#states".
 *
 * The editor's upload dialog shows a media form's fields with their states:
 * this is the site's example of it, as a site's own hook would set them. A
 * checkbox, and a licence that is shown and required while the checkbox is
 * ticked. Neither is a field of the media, so neither is saved.
 */
final class MediaFormHooks {

  use StringTranslationTrait;

  /**
   * Implements hook_form_BASE_FORM_ID_alter() for media forms.
   */
  #[Hook('form_media_form_alter')]
  public function formMediaFormAlter(array &$form, FormStateInterface $formState): void {
    $form['blokkli_playground_licensed'] = [
      '#type' => 'checkbox',
      '#title' => $this->t('Licensed'),
      '#description' => $this->t('Shows the licence. An example of a field that depends on another: neither is saved.'),
      '#weight' => 90,
    ];
    $states = [':input[name="blokkli_playground_licensed"]' => ['checked' => TRUE]];
    $form['blokkli_playground_licence'] = [
      '#type' => 'textfield',
      '#title' => $this->t('Licence'),
      '#weight' => 91,
      '#states' => ['visible' => $states, 'required' => $states],
    ];
    $form['#validate'][] = [static::class, 'validateLicence'];
  }

  /**
   * Requires the licence of a licensed media.
   */
  public static function validateLicence(array &$form, FormStateInterface $formState): void {
    if ($formState->getValue('blokkli_playground_licensed') && trim((string) $formState->getValue('blokkli_playground_licence')) === '') {
      $formState->setErrorByName('blokkli_playground_licence', (string) t('A licensed media needs its licence.'));
    }
  }

}
