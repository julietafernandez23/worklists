<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { CdxButton, CdxIcon } from '@wikimedia/codex'
import { cdxIconAdd, cdxIconCheck, cdxIconClose } from '@wikimedia/codex-icons'
import ArticleSnapshot from '@/components/article/ArticleSnapshot.vue'
import ChromeWrapper from '@/components/chrome/ChromeWrapper.vue'
import { addArticleToCollection } from './saved-items'

definePage({
  meta: {
    title: 'Collections with editing support',
    description:
      'Exploration of editing-related signals for collections that have an editing purpose.',
  },
})

const ARTICLE_TITLE = 'Wet Leg'

const COLLECTIONS = [
  'Fav film actresses',
  'Odd and interesting articles',
  'Birds I want to see in Costa Rica',
  'Articles on bands I want to edit',
]

const bookmarked = ref(false)
const addedToCollection = ref<string | null>(null)

function onBookmarkClick() {
  bookmarked.value = true
  addedToCollection.value = null
}

function onCreateCollection() {
  // Prototype placeholder — wire up in a later iteration.
}

function onAddToCollection(collectionName: string, close: () => void) {
  close()
  addArticleToCollection(collectionName, ARTICLE_TITLE)
  addedToCollection.value = collectionName
}

const savedCollectionLink = computed(() => ({
  path: '/collections-editing-support/saved',
  query: addedToCollection.value ? { collection: addedToCollection.value } : {},
}))
</script>

<template>
  <ChromeWrapper skin="mobile">
    <main>
      <ArticleSnapshot
        class="article"
        article="Wet Leg"
        skin="mobile"
        use-bookmark-action
        :bookmarked="bookmarked"
        @bookmark-click="onBookmarkClick"
      >
        <template #bookmark-menu="{ articleTitle, close }">
          <div class="ces-bookmark-menu">
            <div class="ces-bookmark-menu__header">
              <div class="ces-bookmark-menu__header-top">
                <div class="ces-bookmark-menu__status">
                  <span class="ces-bookmark-menu__check" aria-hidden="true">
                    <CdxIcon :icon="cdxIconCheck" />
                  </span>
                  <p class="ces-bookmark-menu__message">
                    {{ articleTitle }} added to
                    <a href="#" class="ces-bookmark-menu__saved-link" @click.prevent>saved items</a>
                  </p>
                </div>
                <CdxButton
                  class="ces-bookmark-menu__close"
                  weight="quiet"
                  :icon-only="true"
                  aria-label="Close"
                  @click="close"
                >
                  <CdxIcon :icon="cdxIconClose" />
                </CdxButton>
              </div>

              <button
                type="button"
                class="ces-bookmark-menu__create"
                @click="onCreateCollection"
              >
                <CdxIcon :icon="cdxIconAdd" />
                Create collection
              </button>
            </div>

            <ul class="ces-bookmark-menu__list" role="list">
              <li
                v-for="collection in COLLECTIONS"
                :key="collection"
                class="ces-bookmark-menu__item"
              >
                <span class="ces-bookmark-menu__item-label">{{ collection }}</span>
                <CdxButton
                  class="ces-bookmark-menu__item-add"
                  weight="quiet"
                  :icon-only="true"
                  :aria-label="`Add to ${collection}`"
                  @click="onAddToCollection(collection, close)"
                >
                  <CdxIcon :icon="cdxIconAdd" />
                </CdxButton>
              </li>
            </ul>
          </div>
        </template>
      </ArticleSnapshot>

      <div
        v-if="addedToCollection"
        class="ces-added-toast"
        role="status"
        aria-live="polite"
      >
        <span class="ces-added-toast__check" aria-hidden="true">
          <CdxIcon :icon="cdxIconCheck" />
        </span>
        <p class="ces-added-toast__message">
          {{ ARTICLE_TITLE }} has been added to
          <RouterLink :to="savedCollectionLink" class="ces-added-toast__collection">
            {{ addedToCollection }}
          </RouterLink>
        </p>
      </div>
    </main>
  </ChromeWrapper>
</template>

<style scoped>
main {
  padding: 0 var(--spacing-100);
}

/*
 * Bottom-sheet body uses Codex padding (8px 24px). Bleed sections to the sheet edges.
 */
.ces-bookmark-menu {
  display: flex;
  flex-direction: column;
  width: calc(100% + 2 * var(--spacing-150));
  margin: calc(-1 * var(--spacing-50)) calc(-1 * var(--spacing-150)) 0;
}

.ces-bookmark-menu__header {
  padding: var(--spacing-100) var(--spacing-150) 0;
  border-bottom: var(--border-width-base) solid var(--border-color-subtle);
}

.ces-bookmark-menu__header-top {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-50);
}

.ces-bookmark-menu__status {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-50);
  flex: 1 1 auto;
  min-width: 0;
}

.ces-bookmark-menu__check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 1.375rem;
  height: 1.375rem;
  border-radius: 9999px;
  background-color: var(--color-success);
  color: var(--color-inverted, #fff);
}

.ces-bookmark-menu__check :deep(.cdx-icon) {
  width: 0.6875rem;
  height: 0.6875rem;
  color: var(--color-inverted-fixed, #fff);
}

.ces-bookmark-menu__message {
  margin: 0;
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-medium);
  color: var(--color-base);
}

.ces-bookmark-menu__saved-link {
  color: var(--color-progressive);
  font-weight: var(--font-weight-bold);
  text-decoration: none;
}

.ces-bookmark-menu__saved-link:hover {
  text-decoration: underline;
}

.ces-bookmark-menu__close {
  flex-shrink: 0;
  margin: calc(-1 * var(--spacing-25)) calc(-1 * var(--spacing-25)) 0 0;
}

.ces-bookmark-menu__create {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-35);
  width: calc(100% + 2 * var(--spacing-150));
  margin: var(--spacing-75) calc(-1 * var(--spacing-150)) 0;
  padding: 0 var(--spacing-150) var(--spacing-75);
  border: none;
  background: transparent;
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-medium);
  color: var(--color-progressive);
  text-align: start;
  cursor: pointer;
}

.ces-bookmark-menu__create:hover {
  text-decoration: underline;
}

.ces-bookmark-menu__create :deep(.cdx-icon) {
  color: var(--color-progressive);
}

.ces-bookmark-menu__list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.ces-bookmark-menu__item {
  display: flex;
  align-items: center;
  gap: var(--spacing-50);
  padding: var(--spacing-50) var(--spacing-150);
  border-bottom: var(--border-width-base) solid var(--border-color-subtle);
}

.ces-bookmark-menu__item:last-child {
  border-bottom: none;
  padding-bottom: var(--spacing-75);
}

.ces-bookmark-menu__item-label {
  flex: 1 1 auto;
  min-width: 0;
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-medium);
  line-height: var(--line-height-medium);
  color: var(--color-base);
}

.ces-bookmark-menu__item-add :deep(.cdx-icon) {
  color: var(--color-subtle);
}

.ces-added-toast {
  position: fixed;
  right: var(--spacing-100);
  bottom: var(--spacing-100);
  left: var(--spacing-100);
  z-index: 800;
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-50);
  padding: var(--spacing-75) var(--spacing-100);
  border: var(--border-width-base) solid var(--border-color-success);
  border-radius: var(--border-radius-base);
  background-color: var(--background-color-success-subtle);
  box-shadow: 0 4px 4px 0 var(--box-shadow-color-alpha-base),
    0 0 8px 0 var(--box-shadow-color-alpha-base);
}

.ces-added-toast__check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 1.375rem;
  height: 1.375rem;
  border-radius: 9999px;
  background-color: var(--color-success);
}

.ces-added-toast__check :deep(.cdx-icon) {
  width: 0.6875rem;
  height: 0.6875rem;
  color: var(--color-inverted-fixed, #fff);
}

.ces-added-toast__message {
  margin: 0;
  flex: 1 1 auto;
  min-width: 0;
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-medium);
  color: var(--color-base);
}

.ces-added-toast__collection {
  color: var(--color-progressive);
  font-weight: var(--font-weight-bold);
  text-decoration: none;
}

.ces-added-toast__collection:hover {
  text-decoration: underline;
}
</style>
