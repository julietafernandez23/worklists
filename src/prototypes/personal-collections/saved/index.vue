<script setup lang="ts">
definePage({
  meta: {
    title: 'Saved (old address)',
    platform: 'web',
    hidden: true,
  },
})

/** Old address → `/saved`, keeping `?collection=`. */
import { useRoute, useRouter } from 'vue-router'

import { SAVED_PATH } from '../useCollections'

const route = useRoute()
const router = useRouter()

void router.replace({ path: SAVED_PATH, query: route.query })
</script>

<template>
  <span />
</template>
