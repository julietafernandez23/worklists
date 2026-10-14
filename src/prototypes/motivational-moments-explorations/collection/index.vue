<script setup lang="ts">
import CollectionPage from './CollectionPage.vue'

definePage({
  meta: {
    title: 'Motivational moments — Inside a collection',
    description: 'Saved collection grid with settings menu and optional editing mode.',
  },
})
</script>

<template>
  <CollectionPage active-exploration-id="inside-collection" />
</template>
