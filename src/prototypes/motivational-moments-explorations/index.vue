<script setup lang="ts">
definePage({
  meta: {
    title: 'Motivational moments explorations',
    description:
      'Save for later — article page, visual editor, and collection prompt when closing without publishing.',
    group: 'other',
  },
})

import { useRouter } from 'vue-router'
import ArticleLive from '@/components/article/ArticleLive.vue'
import MmeExplorationChrome from './MmeExplorationChrome.vue'

const ARTICLE_TITLE = 'Coral bleaching'

const router = useRouter()

function openVisualEditor() {
  router.push({
    path: '/motivational-moments-explorations/edit',
    query: { article: ARTICLE_TITLE },
  })
}
</script>

<template>
  <MmeExplorationChrome active-exploration-id="save-for-later">
    <main class="mme__main">
      <ArticleLive :article="ARTICLE_TITLE" @edit-click="openVisualEditor" />
    </main>
  </MmeExplorationChrome>
</template>

<style scoped>
.mme__main {
  padding: 0 var(--spacing-100);
}
</style>
