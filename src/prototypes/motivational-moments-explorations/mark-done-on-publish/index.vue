<script setup lang="ts">
import { useRouter } from 'vue-router'
import ArticleLive from '@/components/article/ArticleLive.vue'
import MmeExplorationChrome from '../MmeExplorationChrome.vue'
import { MME_MARK_DONE_HOME_PATH } from '../explorations'

definePage({
  meta: {
    title: 'Motivational moments — Mark as done on publish',
    description:
      'After publishing an edit, prompt to mark the article as done in a collection.',
    group: 'other',
  },
})

const ARTICLE_TITLE = 'Coral bleaching'

const router = useRouter()

function openVisualEditor() {
  router.push({
    path: `${MME_MARK_DONE_HOME_PATH}/edit`,
    query: { article: ARTICLE_TITLE },
  })
}
</script>

<template>
  <MmeExplorationChrome active-exploration-id="mark-done-on-publish">
    <main class="mme-mark-done__main">
      <ArticleLive :article="ARTICLE_TITLE" @edit-click="openVisualEditor" />
    </main>
  </MmeExplorationChrome>
</template>

<style scoped>
.mme-mark-done__main {
  padding: 0 var(--spacing-100);
}
</style>
