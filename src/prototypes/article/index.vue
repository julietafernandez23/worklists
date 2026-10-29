<script setup lang="ts">
definePage({
  meta: {
    title: 'Personal collections (old article URL)',
    platform: 'web',
    hidden: true,
  },
})

/** Old address → `/personal-collections`, keeping query (`?article=` → `?title=`). */
import { useRoute, useRouter } from 'vue-router'

import { ARTICLE_PATH } from '../personal-collections/useCollections'

const route = useRoute()
const router = useRouter()

const query = { ...route.query }
if (query.article !== undefined) {
  query.title = query.article
  delete query.article
}
window.location.replace(router.resolve({ path: ARTICLE_PATH, query }).href)
</script>

<template>
  <span />
</template>
