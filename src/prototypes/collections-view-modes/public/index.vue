<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { CdxProgressBar, CdxThumbnail } from '@wikimedia/codex'
import { cdxIconImage } from '@wikimedia/codex-icons'
import ChromeWrapper from '@/components/chrome/ChromeWrapper.vue'
import { fetchPublicCollectionArticle, type PublicCollectionArticle } from '../article-cards'
import {
  getCollectionArticles,
  getCollectionOwner,
  getCollectionVisibility,
} from '../saved-items'

definePage({
  meta: {
    title: 'Public collection (view modes)',
    description: 'Visitor view of a shared public collection.',
  },
})

const route = useRoute()

const collectionName = computed(() => {
  const value = route.query.collection
  return typeof value === 'string' && value.trim() ? value.trim() : 'Collection'
})

const ownerUsername = computed(() => getCollectionOwner(collectionName.value))

const ownerUserPage = computed(() => ({
  path: '/collections-view-modes/user',
  query: { username: ownerUsername.value },
}))

const articles = ref<PublicCollectionArticle[]>([])
const loading = ref(true)
const isPrivate = ref(false)

const articleCountLabel = computed(() => {
  const count = articles.value.length
  return count === 1 ? '1 article' : `${count} articles`
})

async function loadCollection() {
  loading.value = true
  isPrivate.value = getCollectionVisibility(collectionName.value) === 'private'

  if (isPrivate.value) {
    articles.value = []
    loading.value = false
    return
  }

  const titles = getCollectionArticles(collectionName.value)
  articles.value = await Promise.all(titles.map((title) => fetchPublicCollectionArticle(title)))
  loading.value = false
}

onMounted(loadCollection)
watch(collectionName, loadCollection)
</script>

<template>
  <ChromeWrapper :last-edited-notice="false" skin="mobile">
    <main class="cvp">
      <header class="cvp__header">
        <h1 class="cvp__title">{{ collectionName }}</h1>
        <p class="cvp__meta">
          by
          <RouterLink class="cvp__owner" :to="ownerUserPage">
            {{ ownerUsername }}
          </RouterLink>
          <span class="cvp__meta-sep" aria-hidden="true">·</span>
          <span>{{ articleCountLabel }}</span>
        </p>
      </header>

      <CdxProgressBar v-if="loading" inline aria-label="Loading collection" />

      <p v-else-if="isPrivate" class="cvp__empty">
        This collection is private.
      </p>

      <p v-else-if="!articles.length" class="cvp__empty">
        This collection has no articles yet.
      </p>

      <ul v-else class="cvp__cards" role="list">
        <li v-for="article in articles" :key="article.title" class="cvp__card">
          <CdxThumbnail
            class="cvp__thumbnail"
            :thumbnail="article.thumbnail"
            :placeholder-icon="cdxIconImage"
          />
          <div class="cvp__item-body">
            <span class="cvp__item-title">{{ article.title }}</span>
            <p v-if="article.description" class="cvp__item-description">
              {{ article.description }}
            </p>
          </div>
        </li>
      </ul>
    </main>
  </ChromeWrapper>
</template>

<style scoped>
.cvp {
  padding: var(--spacing-150) var(--spacing-100) var(--spacing-200);
}

.cvp__header {
  margin-bottom: var(--spacing-100);
}

.cvp__title {
  margin: 0 0 var(--spacing-50);
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-xx-large);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-xx-large);
  color: var(--color-base);
}

.cvp__meta {
  margin: 0;
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-medium);
  color: var(--color-subtle);
}

.cvp__owner {
  color: var(--color-progressive);
  text-decoration: none;
}

.cvp__owner:hover {
  text-decoration: underline;
}

.cvp__meta-sep {
  margin-inline: var(--spacing-50);
}

.cvp__empty {
  margin: var(--spacing-100) 0 0;
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-medium);
  line-height: var(--line-height-medium);
  color: var(--color-subtle);
}

.cvp__cards {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50);
  list-style: none;
  margin: 0;
  padding: 0;
}

.cvp__card {
  display: flex;
  align-items: stretch;
  min-height: 6.5rem;
  padding: 0;
  border: var(--border-width-base) solid var(--border-color-subtle);
}

.cvp__thumbnail {
  flex: 0 0 40%;
  width: 40%;
  max-width: 9.5rem;
  margin: 0;
  align-self: stretch;
}

.cvp__thumbnail:deep(.cdx-thumbnail) {
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 6.5rem;
  margin: 0;
}

.cvp__thumbnail:deep(.cdx-thumbnail__image),
.cvp__thumbnail:deep(.cdx-thumbnail__placeholder) {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 6.5rem;
  border: none;
  border-radius: 0;
}

.cvp__thumbnail:deep(.cdx-thumbnail__placeholder__icon) {
  width: 2rem;
  height: 2rem;
}

.cvp__item-body {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  justify-content: flex-start;
  gap: var(--spacing-35);
  min-width: 0;
  padding: var(--spacing-100);
}

.cvp__item-title {
  font-family: var(--font-family-serif);
  font-size: var(--font-size-x-large);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-x-large);
  color: var(--color-base);
}

.cvp__item-description {
  margin: 0;
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-medium);
  line-height: var(--line-height-medium);
  color: var(--color-subtle);
}
</style>
