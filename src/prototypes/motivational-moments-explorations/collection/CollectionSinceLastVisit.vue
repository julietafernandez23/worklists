<script setup lang="ts">
import { computed, ref } from 'vue'
import { CdxButton } from '@wikimedia/codex'

type CollectionArticleRef = {
  title: string
  url: string
}

type SinceLastVisitEditItem = {
  id: string
  kind: 'edit'
  articleTitle: string
  editorName: string
}

type SinceLastVisitSuggestionItem = {
  id: string
  kind: 'suggestion'
  articleTitle: string
  needLabel: string
}

type SinceLastVisitItem = SinceLastVisitEditItem | SinceLastVisitSuggestionItem

const DEMO_ITEMS: SinceLastVisitItem[] = [
  {
    id: 'edit-laika',
    kind: 'edit',
    articleTitle: 'Laika',
    editorName: 'BlueMoonRiver',
  },
  {
    id: 'need-hachiko',
    kind: 'suggestion',
    articleTitle: 'Hachikō',
    needLabel: 'citations',
  },
  {
    id: 'edit-dolly',
    kind: 'edit',
    articleTitle: 'Dolly (sheep)',
    editorName: 'SmallGlasses',
  },
  {
    id: 'need-tanager',
    kind: 'suggestion',
    articleTitle: 'Blue-gray tanager',
    needLabel: 'links',
  },
]

const props = defineProps<{
  articles: CollectionArticleRef[]
}>()

const thankedIds = ref<Set<string>>(new Set())

const items = computed(() => DEMO_ITEMS)

function articleUrl(title: string): string {
  const match = props.articles.find(article => article.title === title)
  if (match) return match.url
  const wikiTitle = title.replace(/ /g, '_')
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(wikiTitle)}`
}

function thank(itemId: string) {
  thankedIds.value = new Set(thankedIds.value).add(itemId)
}

function isThanked(itemId: string): boolean {
  return thankedIds.value.has(itemId)
}
</script>

<template>
  <section class="mme-since-visit" aria-labelledby="mme-since-visit-heading">
    <h2 id="mme-since-visit-heading" class="mme-since-visit__heading">
      Since your last visit
    </h2>

    <ul class="mme-since-visit__list" role="list">
      <li
        v-for="item in items"
        :key="item.id"
        class="mme-since-visit__item"
      >
        <p class="mme-since-visit__text">
          <template v-if="item.kind === 'edit'">
            <a
              class="mme-since-visit__article"
              :href="articleUrl(item.articleTitle)"
              target="_blank"
              rel="noopener noreferrer"
            >{{ item.articleTitle }}</a>
            was edited by
            <span class="mme-since-visit__editor">{{ item.editorName }}</span>
          </template>
          <template v-else>
            <a
              class="mme-since-visit__article"
              :href="articleUrl(item.articleTitle)"
              target="_blank"
              rel="noopener noreferrer"
            >{{ item.articleTitle }}</a>
            still needs {{ item.needLabel }}
          </template>
        </p>

        <CdxButton
          v-if="item.kind === 'edit'"
          class="mme-since-visit__action"
          weight="quiet"
          size="small"
          :disabled="isThanked(item.id)"
          @click="thank(item.id)"
        >
          {{ isThanked(item.id) ? 'Thanked' : 'Thank' }}
        </CdxButton>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.mme-since-visit {
  margin-bottom: var(--spacing-125);
  padding: var(--spacing-75) var(--spacing-100);
  border: var(--border-width-base) solid var(--border-color-subtle);
  border-radius: var(--border-radius-base);
  background-color: var(--background-color-base);
}

.mme-since-visit__heading {
  margin: 0 0 var(--spacing-75);
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-large);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-large);
  color: var(--color-base);
}

.mme-since-visit__list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.mme-since-visit__item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-75);
  padding: var(--spacing-75) 0;
  border-bottom: var(--border-width-base) solid var(--border-color-subtle);
}

.mme-since-visit__item:first-child {
  padding-top: 0;
}

.mme-since-visit__item:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.mme-since-visit__text {
  margin: 0;
  flex: 1 1 auto;
  min-width: 0;
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-medium);
  color: var(--color-base);
}

.mme-since-visit__article {
  font-weight: var(--font-weight-bold);
  color: var(--color-base);
  text-decoration: none;
}

.mme-since-visit__article:hover {
  text-decoration: underline;
}

.mme-since-visit__editor {
  color: var(--color-progressive);
}

.mme-since-visit__action {
  flex-shrink: 0;
  margin-top: calc(-1 * var(--spacing-25));
}
</style>
