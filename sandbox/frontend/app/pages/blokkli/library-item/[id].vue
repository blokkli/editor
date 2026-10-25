<template>
  <BlokkliDrupalEditLibraryItem v-slot="{ entity }" :id>
    <div class="container-content py-8">
      <p class="text-small text-muted">
        {{ $texts('library_item.label', 'Library item') }}
      </p>
      <h1 v-blokkli-editable:label class="font-serif text-h1">
        {{ entity.libraryItemLabel }}
      </h1>
    </div>
  </BlokkliDrupalEditLibraryItem>
</template>

<script lang="ts" setup>
import BlokkliDrupalEditLibraryItem from '#blokkli/drupal/components/BlokkliDrupalEditLibraryItem/index.vue'

// A library item's canonical URL: /<lang>/blokkli/library-item/{id}. Drupal and
// the editor both link here.
const id = String(useRoute().params.id)
</script>
