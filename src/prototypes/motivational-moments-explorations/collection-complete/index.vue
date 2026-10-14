<script setup lang="ts">
import CollectionPage, { type CollectionImpactDisplay } from '../collection/CollectionPage.vue'

definePage({
  meta: {
    title: 'Motivational moments — Collection complete',
    description:
      'Celebratory impact summary when every article in a collection is marked done.',
  },
})

const IMPACT_DISPLAY: CollectionImpactDisplay = {
  done: 10,
  total: 10,
  monthlyReads: 2_400_000,
}
</script>

<template>
  <CollectionPage
    active-exploration-id="collection-complete"
    celebrate-all-done
    :impact-display="IMPACT_DISPLAY"
  />
</template>
