<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import VisualEditorShell from '../../VisualEditorShell.vue'
import { MME_MARK_DONE_HOME_PATH } from '../../explorations'

definePage({
  meta: {
    title: 'Motivational moments — visual editor',
    description: 'Visual editor with mark-as-done prompt after publish.',
  },
})

const COLLECTION_NAME = 'Animals who made history'

const route = useRoute()
const router = useRouter()

const articleTitle = computed(() => {
  const value = route.query.article
  return typeof value === 'string' && value.trim() ? value.trim() : 'Coral bleaching'
})

function returnToExploration() {
  router.push(MME_MARK_DONE_HOME_PATH)
}
</script>

<template>
  <VisualEditorShell
    :article="articleTitle"
    mark-done-on-publish
    :collection-name="COLLECTION_NAME"
    @close="returnToExploration"
  />
</template>
