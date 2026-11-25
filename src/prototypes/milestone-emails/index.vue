<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { CdxButton, CdxCard, CdxIcon } from '@wikimedia/codex'
import {
  cdxIconEllipsis,
  cdxIconExpand,
  cdxIconImage,
  cdxIconLightbulb,
} from '@wikimedia/codex-icons'

import { wikimediaApiFetchHeaders } from '@/config'
import { SAVED_PATH } from '@/prototypes/personal-collections/useCollections'

import senderAvatarUrl from './sender-avatar.png'
import { MILESTONE_RECOMMENDATIONS } from './recommendations'

/** Saved page opens the milestone “Start your Collection” dialog on All items. */
const MILESTONE_EMAIL_ENTRY = 'milestone-email'

/** EN trademark pieces (same CDN as Minerva chrome — reliable in dev). */
const WIKI_GLOBE = 'https://en.wikipedia.org/static/images/icons/wikipedia.png'
const WIKI_WORDMARK =
  'https://en.wikipedia.org/static/images/mobile/copyright/wikipedia-wordmark-en-25.svg'
const WIKI_TAGLINE =
  'https://en.wikipedia.org/static/images/mobile/copyright/wikipedia-tagline-en-25.svg'

definePage({
  meta: {
    title: 'Milestone emails',
    description:
      '5th edit milestone email and invitation to create a collection + post-click CTA flow',
    group: 'other',
    platform: 'mobile',
  },
})

const router = useRouter()

const thumbs = ref<Record<string, string | null>>({})

function startCollection() {
  void router.push({
    path: SAVED_PATH,
    query: { from: MILESTONE_EMAIL_ENTRY },
  })
}

function wikiUrl(title: string) {
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`
}

function cardThumbnail(title: string) {
  const url = thumbs.value[title]
  if (!url) return undefined
  return { url, width: 80, height: 80 }
}

const cards = computed(() =>
  MILESTONE_RECOMMENDATIONS.map((item) => ({
    ...item,
    url: wikiUrl(item.title),
    thumbnail: cardThumbnail(item.title),
  })),
)

onMounted(() => {
  for (const { title } of MILESTONE_RECOMMENDATIONS) {
    void (async () => {
      try {
        const wikiTitle = title.replace(/ /g, '_')
        const res = await fetch(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiTitle)}`,
          { headers: wikimediaApiFetchHeaders('page-summary') },
        )
        if (!res.ok) return
        const data = (await res.json()) as { thumbnail?: { source: string } }
        thumbs.value[title] = data.thumbnail?.source ?? null
      } catch {
        thumbs.value[title] = null
      }
    })()
  }
})
</script>

<template>
  <div class="me-shell">
    <div class="me-thread">
      <h1 class="me-subject">Keep your next editing ideas in one place</h1>
      <span class="me-inbox-chip">Inbox</span>

      <div class="me-sender">
        <img
          class="me-sender__avatar"
          :src="senderAvatarUrl"
          width="40"
          height="40"
          alt=""
        />
        <div class="me-sender__body">
          <div class="me-sender__top">
            <span class="me-sender__name">Wikipedia</span>
            <span class="me-sender__date">13. Oct</span>
            <a class="me-unsubscribe" href="#">Unsubscribe</a>
            <CdxButton class="me-sender__more" weight="quiet" :icon-only="true" aria-label="More">
              <CdxIcon :icon="cdxIconEllipsis" />
            </CdxButton>
          </div>
          <button type="button" class="me-sender__to">
            to me
            <CdxIcon :icon="cdxIconExpand" size="x-small" aria-hidden="true" />
          </button>
        </div>
      </div>

      <article class="me-email-card">
        <header class="me-email-brand">
          <div class="me-email-trademark">
            <img class="me-email-globe" :src="WIKI_GLOBE" width="47" height="47" alt="" />
            <span class="me-email-trademark-text">
              <img
                class="me-email-wordmark"
                :src="WIKI_WORDMARK"
                width="131"
                height="19"
                alt="Wikipedia"
              />
              <img
                class="me-email-tagline"
                :src="WIKI_TAGLINE"
                width="120"
                height="15"
                alt="The Free Encyclopedia"
              />
            </span>
          </div>
        </header>

        <p class="me-email-lede">
          Nice work, Username!
          <strong>You&rsquo;ve made your 5th edit on Wikipedia.</strong>
        </p>

        <p class="me-email-body">
          Start a Collection to organize articles you want to work on next, so they&rsquo;re easy to
          find whenever you&rsquo;re ready to contribute.
        </p>

        <p class="me-email-heading">Discover articles for your next Collection</p>

        <div class="me-card-group">
          <CdxCard
            v-for="item in cards"
            :key="item.title"
            class="me-rec-card"
            :url="item.url"
            :thumbnail="item.thumbnail"
            :icon="item.thumbnail ? undefined : cdxIconImage"
            :force-thumbnail="!item.thumbnail"
            thumbnail-position="inline-start"
            separation="outline"
          >
            <template #title>{{ item.title }}</template>
            <template #description>
              <span class="me-rec-task">
                <CdxIcon :icon="cdxIconLightbulb" size="small" />
                {{ item.task }}
              </span>
            </template>
          </CdxCard>
        </div>

        <CdxButton class="me-cta" weight="primary" action="progressive" @click="startCollection">
          Start a Collection
        </CdxButton>

        <p class="me-email-footer">
          --<br />
          To control which emails we send you, check your
          <a href="#">preferences</a>.
        </p>
      </article>
    </div>
  </div>
</template>

<style scoped>
.me-shell {
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  min-height: 100dvh;
  margin: 0;
  overflow-x: clip;
  background: var(--background-color-interactive-subtle, #f1f3f4);
  font-family: var(--font-family-system-sans);
  color: var(--color-base, #202122);
}

.me-thread {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  padding: var(--spacing-75, 12px) var(--spacing-100, 16px) var(--spacing-250, 40px);
}

/* Email subject — Inter 22px (Gmail mobile). */
.me-subject {
  margin: 0;
  font-family: Inter, var(--font-family-system-sans);
  font-size: 22px;
  font-weight: var(--font-weight-normal, 400);
  line-height: 1.27;
  letter-spacing: 0.01em;
  overflow-wrap: anywhere;
}

.me-inbox-chip {
  display: inline-block;
  margin: var(--spacing-50, 8px) 0 var(--spacing-100, 16px);
  padding: 2px var(--spacing-50, 8px);
  border-radius: var(--border-radius-base, 2px);
  background: var(--background-color-progressive-subtle, #eaf3ff);
  color: var(--color-progressive, #36c);
  font-size: var(--font-size-small, 14px);
  font-weight: var(--font-weight-bold, 700);
}

/* Gmail mobile thread header */
.me-sender {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-100, 16px);
  margin-bottom: var(--spacing-100, 16px);
}

.me-sender__avatar {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.me-sender__body {
  flex: 1;
  min-width: 0;
}

.me-sender__top {
  display: flex;
  align-items: center;
  gap: var(--spacing-75, 12px);
  min-width: 0;
}

.me-sender__name {
  flex-shrink: 0;
  font-family: Roboto, var(--font-family-system-sans);
  font-size: 14px;
  font-weight: var(--font-weight-bold, 700);
  line-height: 20px;
  color: #202124;
}

.me-sender__date {
  flex-shrink: 0;
  font-family: Roboto, var(--font-family-system-sans);
  font-size: 14px;
  font-weight: var(--font-weight-normal, 400);
  line-height: 20px;
  color: #5f6368;
}

.me-unsubscribe {
  margin-left: auto;
  flex-shrink: 0;
  font-family: Roboto, var(--font-family-system-sans);
  font-size: 14px;
  line-height: 20px;
  color: #1a73e8;
  text-decoration: none;
}

.me-sender__more {
  flex-shrink: 0;
  margin-inline-end: calc(-1 * var(--spacing-50, 8px));
}

.me-sender__to {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin: 0;
  padding: 0;
  border: 0;
  background: none;
  font-family: Roboto, var(--font-family-system-sans);
  font-size: 12px;
  line-height: 16px;
  color: #5f6368;
  cursor: default;
}

.me-sender__to .cdx-icon {
  color: #5f6368;
}

.me-email-card {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  padding: var(--spacing-150, 24px) var(--spacing-100, 16px);
  border: 1px solid var(--border-color-subtle, #c8ccd1);
  border-radius: var(--border-radius-base, 2px);
  background: var(--background-color-base, #fff);
}

.me-email-brand {
  margin-bottom: var(--spacing-100, 16px);
  text-align: start;
}

.me-email-trademark {
  display: flex;
  align-items: center;
  gap: var(--spacing-50, 8px);
  max-width: 167px;
}

.me-email-globe {
  flex-shrink: 0;
  display: block;
  width: 47px;
  height: 47px;
}

.me-email-trademark-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.me-email-wordmark,
.me-email-tagline {
  display: block;
  max-width: 100%;
  height: auto;
}

.me-email-lede {
  margin: 0 0 var(--spacing-100, 16px);
  overflow-wrap: anywhere;
  font-family: var(--font-family-base);
  font-size: var(--font-size-medium, 16px);
  font-weight: var(--font-weight-normal, 400);
  line-height: var(--line-height-medium, 1.625);
}

.me-email-body,
.me-email-footer {
  margin: 0 0 var(--spacing-100, 16px);
  overflow-wrap: anywhere;
  font-family: var(--font-family-base);
  font-size: var(--font-size-medium, 16px);
  font-weight: var(--font-weight-normal, 400);
  line-height: var(--line-height-medium, 1.625);
  color: var(--color-base, #202122);
}

/* UI Text Bold — one Codex text style, no mixing tokens. */
.me-email-heading {
  margin: 0 0 var(--spacing-75, 12px);
  font-family: var(--font-family-base);
  font-size: var(--font-size-medium, 16px);
  font-weight: var(--font-weight-bold, 700);
  line-height: var(--line-height-medium, 1.625);
}

.me-card-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75, 12px);
  width: 100%;
  min-width: 0;
  max-width: 100%;
  margin-bottom: var(--spacing-150, 24px);
}

.me-rec-card {
  width: 100%;
  min-width: 0;
  max-width: 100%;
}

.me-rec-card:deep(.cdx-card) {
  box-sizing: border-box;
  max-width: 100%;
  min-width: 0;
}

.me-rec-card:deep(.cdx-card__text__title),
.me-rec-card:deep(.cdx-card__text__description) {
  overflow-wrap: anywhere;
}

.me-rec-task {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-25, 4px);
}

.me-cta {
  width: 100%;
  justify-content: center;
  margin-bottom: var(--spacing-150, 24px);
}

.me-email-footer a {
  color: var(--color-progressive, #36c);
}
</style>

<!-- Full-bleed mobile email canvas — no white body gutter outside the shell. -->
<style>
body:has(.me-shell) {
  background-color: var(--background-color-interactive-subtle, #f1f3f4);
}
</style>