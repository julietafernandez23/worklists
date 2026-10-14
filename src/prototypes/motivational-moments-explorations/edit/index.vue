<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import VisualEditorShell from '../VisualEditorShell.vue'
import { MME_HOME_PATH } from '../explorations'

definePage({
  meta: {
    title: 'Motivational moments — visual editor',
    description: 'Visual editor shell for motivational moments explorations.',
  },
})

const route = useRoute()
const router = useRouter()

const articleTitle = computed(() => {
  const value = route.query.article
  return typeof value === 'string' && value.trim() ? value.trim() : 'Coral bleaching'
})

function returnToExploration() {
  router.push(MME_HOME_PATH)
}

function onPublished() {
  window.setTimeout(returnToExploration, 2000)
}
</script>

<template>
  <VisualEditorShell
    :article="articleTitle"
    @close="returnToExploration"
    @publish="onPublished"
  />
</template>
