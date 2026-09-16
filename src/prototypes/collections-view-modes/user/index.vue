<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import ChromeWrapper from '@/components/chrome/ChromeWrapper.vue'

definePage({
  meta: {
    title: 'User page (collections prototype)',
    description: 'Fake user page stub for collection owner links.',
  },
})

const route = useRoute()

const username = computed(() => {
  const value = route.query.username
  return typeof value === 'string' && value.trim() ? value.trim() : 'User'
})
</script>

<template>
  <ChromeWrapper :last-edited-notice="false" skin="mobile">
    <main class="cvm-user">
      <h1 class="cvm-user__title">User: {{ username }}</h1>
      <p class="cvm-user__note">
        Prototype user page — not a live Wikipedia account.
      </p>
    </main>
  </ChromeWrapper>
</template>

<style scoped>
.cvm-user {
  padding: var(--spacing-150) var(--spacing-100) var(--spacing-200);
}

.cvm-user__title {
  margin: 0 0 var(--spacing-100);
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-xx-large);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-xx-large);
  color: var(--color-base);
}

.cvm-user__note {
  margin: 0;
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-medium);
  line-height: var(--line-height-medium);
  color: var(--color-subtle);
}
</style>
