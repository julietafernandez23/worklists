<script setup lang="ts">
import CollectionPage from '../collection/CollectionPage.vue'

definePage({
  meta: {
    title: 'Motivational moments — Collection reminders',
    description:
      'One-time prompt to opt into collection reminders when an editor sets article status.',
  },
})
</script>

<template>
  <CollectionPage
    active-exploration-id="collection-reminders"
    prompt-reminders-on-status
  />
</template>
