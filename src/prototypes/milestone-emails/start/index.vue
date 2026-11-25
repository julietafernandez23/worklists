<script setup lang="ts">
/**
 * Legacy CTA URL — milestone email now lands on Saved (All items) with the dialog.
 */
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { SAVED_PATH } from '@/prototypes/personal-collections/useCollections'

definePage({
  meta: {
    title: 'Milestone emails — start collection',
    description: 'Redirects to Saved with the milestone collection dialog.',
    hidden: true,
    platform: 'mobile',
  },
})

const route = useRoute()
const router = useRouter()

onMounted(() => {
  const { title: _legacyTitle, ...rest } = route.query
  void router.replace({
    path: SAVED_PATH,
    query: { ...rest, from: 'milestone-email' },
  })
})
</script>

<template>
  <span />
</template>