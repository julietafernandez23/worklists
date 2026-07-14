<script setup lang="ts">
import { ref } from 'vue'
import ChromeWrapper from '@/components/chrome/ChromeWrapper.vue'

definePage({
  meta: { title: 'Event:Women in Rock Editathon' },
})

const activeTab = ref<'event' | 'discussion'>('event')
</script>

<template>
  <ChromeWrapper>
    <main class="ep__event-page">
      <div class="ep__event-header">
        <h1 class="ep__event-title">
          <span class="ep__event-title-prefix">Event:</span>Women in Rock Editathon
        </h1>
        <div class="ep__event-tabs">
          <button
            class="ep__event-tab"
            :class="{ 'ep__event-tab--active': activeTab === 'event' }"
            @click="activeTab = 'event'"
          >Event</button>
          <button
            class="ep__event-tab ep__event-tab--discussion"
            :class="{ 'ep__event-tab--active': activeTab === 'discussion' }"
            @click="activeTab = 'discussion'"
          >Discussion</button>
        </div>
        <div class="ep__event-tabs-divider" />
      </div>

      <div v-if="activeTab === 'event'" class="ep__event-body">
        <p>
          The <strong>Women in Rock Editathon</strong> is a hypothetical collaborative editing event focused on improving Wikipedia's coverage of women in rock music. This event is used for testing and prototyping purposes.
        </p>
      </div>

      <div v-else class="ep__event-body">
        <p class="ep__event-empty">No discussion yet.</p>
      </div>
    </main>
  </ChromeWrapper>
</template>

<style scoped>
.ep__event-page {
  padding: var(--spacing-150) var(--spacing-100) var(--spacing-100);
}

.ep__event-header {
  margin-bottom: var(--spacing-100);
}

.ep__event-title {
  font-family: var(--font-family-serif, 'Linux Libertine', 'Georgia', serif);
  font-size: 1.95em;
  font-weight: var(--font-weight-normal, 400);
  line-height: 1.3;
  color: var(--color-base);
  margin: 0 0 var(--spacing-75);
}

.ep__event-title-prefix {
  color: var(--color-base);
}

.ep__event-tabs {
  display: flex;
  gap: var(--spacing-100);
  margin-bottom: 0;
}

.ep__event-tab {
  background: none;
  border: none;
  padding: var(--spacing-25) 0;
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-bold);
  color: var(--color-subtle);
  cursor: pointer;
  position: relative;
}

.ep__event-tab--active {
  color: var(--color-base);
}

.ep__event-tab--active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 2px;
  background-color: var(--color-base);
}

.ep__event-tab--discussion {
  color: var(--color-destructive, #d73333);
  font-weight: var(--font-weight-normal);
}

.ep__event-tab--discussion.ep__event-tab--active {
  color: var(--color-destructive, #d73333);
}

.ep__event-tabs-divider {
  border-top: 1px solid var(--border-color-subtle);
  margin-top: 0;
}

.ep__event-body {
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-medium);
  line-height: var(--line-height-medium);
  color: var(--color-base);
}

.ep__event-body p {
  margin: 0 0 var(--spacing-100);
}

.ep__event-body h2 {
  font-family: var(--font-family-serif, 'Linux Libertine', 'Georgia', serif);
  font-size: 1.5em;
  font-weight: var(--font-weight-normal, 400);
  border-bottom: 1px solid var(--border-color-subtle);
  padding-bottom: var(--spacing-25);
  margin: var(--spacing-150) 0 var(--spacing-75);
}

.ep__event-empty {
  color: var(--color-subtle);
}
</style>
