# {{ $params.title }}

{{ $params.description }}

<a :href="$params.sourceUrl">Source</a>

## Required adapter methods

<template v-if="$params.requiredAdapterMethods.length">
  <ul>
    <li v-for="method in $params.requiredAdapterMethods">
      <a :href="'/adapter/' + method">
        {{ method }}
      </a>
    </li>
  </ul>
</template>
<template v-else>
  None.
</template>

## Settings

<template v-if="$params.settings.length">
  <table style="width: 100%; display: table">
    <thead>
      <tr>
        <th>Key</th>
        <th>type</th>
        <th>Label</th>
        <th>Default</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="setting in $params.settings" style="width: 100%">
        <th>{{ setting.key }}</th>
        <td>{{ setting.type }}</td>
        <td>{{ setting.label }}</td>
        <td>{{ setting.default }}</td>
      </tr>
    </tbody>
  </table>
</template>
<template v-else>
  None.
</template>

<!-- @content -->
