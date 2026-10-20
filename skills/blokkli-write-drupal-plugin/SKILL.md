---
name: blokkli-write-drupal-plugin
description: >-
  Write paragraphs_blokkli plugins in a custom Drupal module: transform plugins
  (an operation on the selected paragraphs, optionally with a form, e.g. search
  and replace) and conversion plugins (turn one paragraph type into another,
  e.g. a text into a title), and what a mutation plugin needs beyond them. Use
  when editors should convert or batch-edit paragraphs in blökkli, or when a new
  plugin doesn't show up in the editor, is missing while editing a translation,
  changes the wrong language, or its label isn't translated.
license: MIT
compatibility: >-
  Requires a working blökkli + Drupal setup (see the blokkli-setup-drupal
  skill): @blokkli/editor 2.x with the drupal module and paragraphs_blokkli 2.x,
  plus a custom module and access to the Drupal backend (drush, config export).
metadata:
  author: blokkli
  version: '1.0.1'
  targets: '@blokkli/editor 2.x, paragraphs_blokkli 2.x'
  docs: https://docs.blokk.li/features/transform
---

# Drupal plugins for blökkli

Every change in blökkli's editor is a mutation on the edit state, and
paragraphs_blokkli has three plugin types for custom ones:

| Plugin type    | Module                          | In the editor                                     | Frontend code     |
| -------------- | ------------------------------- | ------------------------------------------------- | ----------------- |
| **Transform**  | `paragraphs_blokkli_transform`  | an action on the selected paragraphs, with a form | none              |
| **Conversion** | `paragraphs_blokkli_conversion` | "Convert to: …" on a paragraph of the source type | none              |
| **Mutation**   | `paragraphs_blokkli`            | nothing by itself                                 | an adapter method |

Transforms and conversions need no frontend code: the Drupal adapter reads them
through GraphQL, and the editor offers them. Prefer them to a mutation plugin.

The docs: [transform](https://docs.blokk.li/features/transform),
[conversions](https://docs.blokk.li/features/conversions). This skill is the
procedure and the traps.

## 1. Setup

- Enable `paragraphs_blokkli_transform` and `paragraphs_blokkli_conversion`.
- On the GraphQL server, enable the extension `paragraphs_blokkli_transform`.
  Conversions come with blökkli's edit extension.
- The plugins go into a custom module: `src/Plugin/ParagraphsBlokkli/Transform/`
  and `src/Plugin/ParagraphsBlokkli/Conversion/`, with PHP attributes. The
  managers still read annotations, as in older examples.
- **After adding or changing a plugin, run `drush cr`.** Plugin discovery is
  cached, and so are the GraphQL responses that list the plugins.

## 2. Transform plugins

A transform changes the paragraphs the editor selected, in one mutation. This
one replaces a text in text and title paragraphs, e.g. a renamed office:

```php
<?php

declare(strict_types=1);

namespace Drupal\my_module\Plugin\ParagraphsBlokkli\Transform;

use Drupal\Component\Utility\Html;
use Drupal\Core\StringTranslation\StringTranslationTrait;
use Drupal\Core\StringTranslation\TranslatableMarkup;
use Drupal\paragraphs_blokkli\Model\PluginConfig\PluginConfigBuilder;
use Drupal\paragraphs_blokkli\ParagraphMutationContextInterface;
use Drupal\paragraphs_blokkli\ParagraphsBlokkliUserInputPluginInterface;
use Drupal\paragraphs_blokkli_transform\Attribute\ParagraphTransform;
use Drupal\paragraphs_blokkli_transform\ParagraphTransformPluginBase;

#[ParagraphTransform(
  id: 'search_and_replace',
  title: new TranslatableMarkup('Search and replace'),
  description: new TranslatableMarkup('Replaces a text everywhere in the selected blocks.'),
  // The paragraph types it's offered for.
  bundles: ['text', 'title'],
  // A "Preview" in the dialog runs it without keeping the result.
  allowPreview: TRUE,
)]
final class SearchAndReplace extends ParagraphTransformPluginBase implements ParagraphsBlokkliUserInputPluginInterface {

  use StringTranslationTrait;

  public function getUserInputConfiguration(PluginConfigBuilder $builder): void {
    $builder->addText('search')->label((string) $this->t('Search'))->required();
    $builder->addText('replace')->label((string) $this->t('Replace with'));
  }

  public function transform(ParagraphMutationContextInterface $context, array $uuids, array $userConfig): void {
    $search = (string) ($userConfig['search'] ?? '');
    if ($search === '') {
      return;
    }
    foreach ($uuids as $uuid) {
      $paragraph = $context->getProxy($uuid)?->getParagraph();
      if ($paragraph?->hasField('field_text')) {
        foreach ($paragraph->get('field_text') as $item) {
          // Only the text nodes: a str_replace() on the markup would also
          // change link URLs.
          $document = Html::load((string) $item->get('value')->getValue());
          foreach ((new \DOMXPath($document))->query('//text()') ?: [] as $node) {
            $node->nodeValue = str_replace($search, (string) ($userConfig['replace'] ?? ''), (string) $node->nodeValue);
          }
          $item->set('value', Html::serialize($document));
        }
      }
    }
  }

}
```

- **The attribute:** `bundles` (the source types), and optionally
  `targetBundles`, `min` and `max` (how many selected paragraphs).
- **`transform()`** gets the selected UUIDs and changes the paragraphs of their
  proxies in place. The context can also add, move and remove proxies. The
  editor's undo and "revert" cover the result, like every mutation.
- **The form:** `ParagraphsBlokkliUserInputPluginInterface`. The builder has
  `addText()`, `addOptions()`, `addCheckbox()`, `addHost()` and `addSeed()`;
  each takes a `label()` (a string), `description()`, `required()` and
  `default()`. The values arrive in `$userConfig` by name.
- **`$this->t()`:** the base class extends the component `PluginBase`, which has
  no `t()`. Add `StringTranslationTrait`.
- **Services:** the base class's `create()` passes the `uuid` service. Override
  `create()` and the constructor to add more, and pass the UUID service on. Keep
  injected properties `protected`: the base class uses
  `DependencySerializationTrait`, which can't restore private ones.

### Transforms in translations

- **By default, a transform is only offered in the host's source language:**
  most restructure paragraphs, which a translation can't.
- **A transform gets no language.** One that only changes the text, like the one
  above, is derived: one plugin per language, which `applies()` in its language
  and changes that translation. Don't take the language from the request: the
  edit state covers every language and every request replays it, so the
  replacement would move to whichever language publishes. The deriver:

  ```php
  namespace Drupal\my_module\Plugin\Derivative;

  use Drupal\Component\Plugin\Derivative\DeriverBase;
  use Drupal\Core\Language\LanguageManagerInterface;
  use Drupal\Core\Plugin\Discovery\ContainerDeriverInterface;
  use Symfony\Component\DependencyInjection\ContainerInterface;

  final class SearchAndReplaceDeriver extends DeriverBase implements ContainerDeriverInterface {

    public function __construct(
      protected readonly LanguageManagerInterface $languageManager,
    ) {}

    public static function create(ContainerInterface $container, $base_plugin_id): static {
      return new static($container->get('language_manager'));
    }

    public function getDerivativeDefinitions($base_plugin_definition): array {
      foreach (array_keys($this->languageManager->getLanguages()) as $langcode) {
        $this->derivatives[$langcode] = ['langcode' => $langcode] + $base_plugin_definition;
      }
      return $this->derivatives;
    }

  }
  ```

  The attribute gets `deriver: SearchAndReplaceDeriver::class`, and the plugin
  reads its language from the definition. A paragraph without that translation
  keeps its text:

  ```php
  public function applies(FieldableEntityInterface $hostEntity, string $langcode): bool {
    return $langcode === $this->pluginDefinition['langcode'];
  }

  // In transform(), for each paragraph:
  $langcode = $this->pluginDefinition['langcode'];
  if (!$paragraph->hasTranslation($langcode)) {
    continue;
  }
  $paragraph = $paragraph->getTranslation($langcode);
  ```

  The plugin IDs get the langcode: `search_and_replace:de`.

- **A transform whose `applies()` is TRUE in every language changes every
  language.**

## 3. Conversion plugins

A conversion turns a paragraph into a new one of another type. One plugin per
direction:

```php
#[ParagraphConversion(
  id: 'title_to_text',
  title: new TranslatableMarkup('Convert a title to a text'),
  source_bundle: 'title',
  target_bundle: 'text',
)]
final class TitleToText extends ParagraphConversionPluginBase {

  public function convert(ParagraphInterface $paragraph, ParagraphMutationContextInterface $context): array {
    $title = trim((string) $paragraph->get('field_title')->value);
    return [
      'field_text' => [
        'value' => $title === '' ? '' : '<h2>' . Html::escape($title) . '</h2>',
        // A format the target field allows.
        'format' => 'basic_html',
      ],
    ];
  }

}
```

- **`convert()` returns the new paragraph's field values.** Fields the target
  type doesn't have are skipped. `NULL` aborts the conversion ("The block could
  not be converted").
- **It runs once per translation:** first for the source language, then for each
  translation, whose values become the new paragraph's translation. Anything
  language-dependent follows `$paragraph->language()`, e.g. a link's URL:
  `$url->setOption('language', $paragraph->language())`.
- **Nested paragraphs** are deleted, unless `getTargetFieldForParagraph()`
  returns a field of the target that allows their type.
- **Services:** the base class doesn't implement
  `ContainerFactoryPluginInterface`. Implement it, with `create()` and a
  constructor.

## 4. Mutation plugins

A mutation plugin (`#[ParagraphMutation]`, `execute()` with the arguments its
attribute declares) becomes a field of `ParagraphsEditMutationState` in GraphQL,
named by its ID. **The editor never calls it by itself:** it needs a GraphQL
document in Nuxt and an adapter method in `blokkli.editAdapter.ts` that sends
it, e.g. `addBlockFromClipboardItem()` for pasted content.

paragraphs_blokkli's own mutations are the examples: `add_video_remote`
(`src/Plugin/ParagraphsBlokkli/Mutation/AddVideoRemote.php`) and how the Drupal
adapter sends it for a pasted video URL. Write one only when neither a transform
nor a conversion fits.

## 5. Translated labels

The editor shows a transform's `title` and `description`, and its form's labels,
in the language of the request (a conversion appears as "Convert to:" and the
target type's label). Translate them like any string of a custom module, with a
`.po` file per language in the module:

```yaml
# my_module.info.yml
'interface translation project': my_module
'interface translation server pattern': modules/custom/my_module/translations/%language.po
```

Then `drush locale:check && drush locale:update`. Give generic words a context
(`$this->t('Search', [], ['context' => 'my_module'])`, `msgctxt "my_module"` in
the `.po` file), or the import replaces core's translation of "Search".

## 6. Check it

After `drush cr`, as a user with blökkli's edit permission:

```graphql
{
  paragraphsBlokkliConversions {
    sourceBundle
    targetBundle
  }
  paragraphsBlokkliGetTransformPlugins(
    entityType: NODE
    entityUuid: "<a node's UUID>"
    langcode: "en"
  ) {
    id
    label
    bundles
  }
}
```

Then, in the editor: select a paragraph of the source type. Its actions offer
the transform and "Convert to: …". Run each, check the result in every language,
and revert.

phpcs (`Drupal`, `DrupalPractice`) and phpstan with `phpstan-drupal` catch most
mistakes in these plugins.

## Traps, by symptom

- **A new or changed plugin doesn't show up:** `drush cr` (section 1).
- **A transform is missing while editing a translation:** `applies()` (section
  2).
- **A transform in a translation changes the source language, or its change is
  lost when another language publishes:** derive it per language (section 2).
- **After a conversion, a translation links to the other language's page:**
  build URLs in `$paragraph->language()` (section 3).
- **A transform breaks links:** it replaced text in the markup instead of the
  text nodes.
- **"Call to an undefined method t()" in a transform:**
  `StringTranslationTrait`.
- **The labels stay English in other languages:** section 5.
