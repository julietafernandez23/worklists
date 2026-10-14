<script setup lang="ts">
import CollectionPage from '../collection/CollectionPage.vue'

definePage({
  meta: {
    title: 'Motivational moments — Since your last visit',
    description:
      'Collection view with a digest of edits and outstanding work since the last visit.',
  },
})
</script>

<template>
  <CollectionPage
    active-exploration-id="since-last-visit"
    show-since-last-visit
  />
</template>
