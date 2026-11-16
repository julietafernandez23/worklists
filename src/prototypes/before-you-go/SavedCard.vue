<script setup lang="ts">
/**
 * One card on the Saved page. Three looks, one per saved kind:
 *  - article: image, title, short description
 *  - section: article image, section heading
 *  - passage: the excerpt
 * Sections and passages add "from Article" as the description and their kind
 * (icon + "Section" / "Passage") as supporting text underneath.
 *
 * `list` (mobile): a row — square thumbnail on the left, the same text on the right.
 * `compact`: a small grid card for previews (collection rows) — square image,
 *   title only for articles, shorter excerpt for passages.
 * `thumb`: just a square thumbnail (compact collection rows); the title is its
 *   tooltip and accessible name. Items with no image show a mini title instead
 *   (passages: the start of the excerpt).
 */
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { CdxIcon, CdxInfoChip } from '@wikimedia/codex'
import {
  cdxIconChartLine,
  cdxIconImage,
  cdxIconLightbulb,
  cdxIconQuotes,
  cdxIconTextSummary,
} from '@wikimedia/codex-icons'

import { savedEditingSignalsForKey } from './savedEditingDemo'
import { linkOf, useCollections, type SavedItem } from './useCollections'

const props = defineProps<{
  item: SavedItem
  list?: boolean
  compact?: boolean
  thumb?: boolean
}>()

const { summary, ui } = useCollections()
const data = computed(() => summary(props.item.title))
const showEditingInfo = computed(() => ui.showEditingInfo && props.item.kind === 'article')
const editingSignals = computed(() =>
  showEditingInfo.value ? savedEditingSignalsForKey(props.item.key) : null,
)
const articleTitle = computed(() => data.value?.title ?? props.item.title)
/** A section's own image when it had one, otherwise the article's lead image. */
const imageUrl = computed(() =>
  props.item.kind === 'section' && props.item.imageUrl
    ? props.item.imageUrl
    : (data.value?.thumbnailUrl ?? null),
)
const hasImage = computed(() => !!imageUrl.value)

/** Thumbnail tooltip / accessible name. */
const thumbLabel = computed(() => {
  if (props.item.kind === 'section') return `${props.item.heading} (from ${articleTitle.value})`
  if (props.item.kind === 'passage') return `Passage from ${articleTitle.value}`
  return articleTitle.value
})
</script>

<template>
  <!-- Mobile list row -->
  <div v-if="list" class="saved-row-wrap">
    <CdxInfoChip
      v-if="editingSignals?.impactLabel"
      class="saved-row-impact"
      status="subtle"
    >
      {{ editingSignals.impactLabel }}
    </CdxInfoChip>
    <RouterLink class="saved-row" :class="`saved-row--${item.kind}`" :to="linkOf(item)">
    <!-- Every row keeps the thumbnail slot so rows line up; no image → placeholder. -->
    <img
      v-if="item.kind !== 'passage' && hasImage"
      class="saved-row__thumb"
      :src="imageUrl!"
      alt=""
      loading="lazy"
    />
    <span
      v-else-if="item.kind !== 'passage' && data === undefined"
      class="saved-row__thumb saved-row__thumb--loading"
    />
    <span v-else class="saved-row__thumb saved-row__thumb--placeholder" aria-hidden="true">
      <CdxIcon :icon="item.kind === 'passage' ? cdxIconQuotes : cdxIconImage" />
    </span>

    <span class="saved-row__body">
      <blockquote v-if="item.kind === 'passage'" class="saved-row__quote">
        {{ item.excerpt }}
      </blockquote>
      <span v-else class="saved-row__title">{{
        item.kind === 'section' ? item.heading : articleTitle
      }}</span>

      <span v-if="item.kind === 'article'" class="saved-row__description">
        {{ data?.description }}
      </span>
      <span v-else class="saved-row__description">
        From: {{ articleTitle
        }}<template v-if="item.kind === 'passage' && item.heading"> › {{ item.heading }}</template>
      </span>

      <span v-if="item.kind !== 'article'" class="saved-card__kind saved-row__kind">
        <CdxIcon
          :icon="item.kind === 'section' ? cdxIconTextSummary : cdxIconQuotes"
          size="x-small"
        />
        {{ item.kind === 'section' ? 'Section' : 'Passage' }}
      </span>

      <div v-if="editingSignals" class="saved-row__editing">
        <small class="saved-row__signal">
          <CdxIcon :icon="cdxIconChartLine" size="small" />
          {{ editingSignals.viewsLabel }}
        </small>
        <small class="saved-row__signal">
          <CdxIcon :icon="cdxIconLightbulb" size="small" />
          {{ editingSignals.suggestionLabel }}
        </small>
      </div>
    </span>
    </RouterLink>
  </div>

  <!-- Thumbnail only -->
  <RouterLink
    v-else-if="thumb"
    class="saved-thumb"
    :to="linkOf(item)"
    :title="thumbLabel"
    :aria-label="thumbLabel"
  >
    <img
      v-if="item.kind !== 'passage' && hasImage"
      class="saved-thumb__image"
      :src="imageUrl!"
      alt=""
      loading="lazy"
    />
    <span v-else-if="item.kind !== 'passage' && data === undefined" />
    <span v-else-if="item.kind === 'passage'" class="saved-thumb__text saved-thumb__text--quote">
      {{ item.excerpt }}
    </span>
    <span v-else class="saved-thumb__text">
      {{ item.kind === 'section' ? item.heading : articleTitle }}
    </span>
  </RouterLink>

  <!-- Grid card -->
  <RouterLink
    v-else
    class="saved-card"
    :class="[`saved-card--${item.kind}`, { 'saved-card--compact': compact }]"
    :to="linkOf(item)"
  >
    <!-- Content first: the passage's words, or the image. -->
    <blockquote v-if="item.kind === 'passage'" class="saved-card__quote">
      {{ item.excerpt }}
    </blockquote>
    <template v-else>
      <img v-if="hasImage" class="saved-card__image" :src="imageUrl!" alt="" loading="lazy" />
      <span v-else-if="data === undefined" class="saved-card__image saved-card__image--loading" />
      <!-- No image on desktop: text only (mobile rows use a small placeholder instead). -->
    </template>

    <CdxInfoChip
      v-if="editingSignals?.impactLabel && !compact && !thumb"
      class="saved-card-impact"
      status="subtle"
    >
      {{ editingSignals.impactLabel }}
    </CdxInfoChip>

    <!--
      Title + description share one 4-line budget (a long title leaves fewer
      lines). Sections: the heading is the title, its article the description.
      Passages: the excerpt above is the content, its source the description.
    -->
    <span v-if="item.kind !== 'passage'" class="saved-card__text">
      <span class="saved-card__title">{{
        item.kind === 'section' ? item.heading : articleTitle
      }}</span>
      <template v-if="item.kind === 'section'">
        <br />
        <span class="saved-card__description">From: {{ articleTitle }}</span>
      </template>
      <template v-else-if="data?.description && !compact">
        <br />
        <span class="saved-card__description">{{ data.description }}</span>
      </template>
    </span>
    <span v-else class="saved-card__text saved-card__text--source">
      <span class="saved-card__description">
        From: {{ articleTitle }}<template v-if="item.heading"> › {{ item.heading }}</template>
      </span>
    </span>

    <div v-if="editingSignals && !list && !compact && !thumb" class="saved-card__editing">
      <small class="saved-card__signal">
        <CdxIcon :icon="cdxIconChartLine" size="small" />
        {{ editingSignals.viewsLabel }}
      </small>
      <small class="saved-card__signal">
        <CdxIcon :icon="cdxIconLightbulb" size="small" />
        {{ editingSignals.suggestionLabel }}
      </small>
    </div>

    <!-- Supporting text: what kind of save this is. -->
    <span v-if="item.kind !== 'article'" class="saved-card__kind">
      <CdxIcon
        :icon="item.kind === 'section' ? cdxIconTextSummary : cdxIconQuotes"
        size="x-small"
      />
      {{ item.kind === 'section' ? 'Section' : 'Passage' }}
    </span>
  </RouterLink>
</template>

<style scoped>
.saved-card-impact {
  align-self: flex-start;
  margin-bottom: var(--spacing-50, 8px);
}

.saved-card {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  min-height: 280px;
  padding: var(--spacing-75, 12px);
  border: 1px solid var(--border-color-base, #a2a9b1);
  border-radius: var(--border-radius-base, 2px);
  background-color: var(--background-color-base, #fff);
  color: var(--color-base, #202122);
  text-decoration: none;
}

/* Hover / focus match Codex's linked CdxCard. */
.saved-card,
.saved-thumb {
  transition-property: background-color, color, border-color, box-shadow;
  transition-duration: var(--transition-duration-base, 100ms);
}

.saved-card:hover,
.saved-thumb:hover {
  border-color: var(--border-color-interactive--hover, #27292d);
}

.saved-card:focus,
.saved-thumb:focus {
  outline: 1px solid transparent;
}

.saved-card:focus-visible,
.saved-thumb:focus-visible {
  border-color: var(--border-color-progressive--focus, #36c);
  box-shadow: inset 0 0 0 1px var(--box-shadow-color-progressive--focus, #36c);
}

.saved-card__image {
  display: block;
  width: 100%;
  aspect-ratio: 166 / 158;
  margin-bottom: var(--spacing-100, 16px);
  border: 1px solid var(--border-color-subtle, #c8ccd1);
  object-fit: cover;
  box-sizing: border-box;
}

.saved-card__image--loading {
  background-color: var(--background-color-interactive-subtle, #f8f9fa);
}

/* Title and description flow as one block so they can share a 4-line clamp. */
.saved-card__text {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
  font-size: var(--font-size-small, 14px);
  line-height: var(--line-height-small, 1.571);
}

.saved-card__title {
  font-weight: var(--font-weight-bold, 700);
}

.saved-card__description {
  color: var(--color-subtle, #54595d);
}

/* Passage cards: the excerpt, in serif, fills the space an image would. */
.saved-card__quote {
  display: -webkit-box;
  margin: 0;
  /* Reset the global blockquote rule's left border and indent. */
  padding: 0;
  border: 0;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 8;
  font-family: var(--font-family-serif, 'Linux Libertine', Georgia, serif);
  font-size: var(--font-size-medium, 16px);
  line-height: var(--line-height-small, 1.375);
  color: var(--color-base, #202122);
}

/* Passage source line sits under the excerpt. */
.saved-card__text--source {
  margin-top: var(--spacing-75, 12px);
}

/* Supporting text: icon + kind, small and quiet, anchored to the card's bottom
   so it lines up across every card in a row. */
.saved-card__kind {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-25, 4px);
  margin-top: auto;
  padding-top: var(--spacing-50, 8px);
  color: var(--color-subtle, #54595d);
  font-size: var(--font-size-x-small, 12px);
  line-height: var(--line-height-x-small, 1.5);
}

.saved-card__kind :deep(.cdx-icon) {
  color: var(--color-subtle, #54595d);
}

/* ---- Thumbnail only (compact collection rows) ---- */
.saved-thumb {
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 100%;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  border: 1px solid var(--border-color-subtle, #c8ccd1);
  border-radius: var(--border-radius-base, 2px);
  background-color: var(--background-color-base, #fff);
}

/* The image fills the square, so draw Codex's inset focus line above it. */
.saved-thumb {
  position: relative;
}

.saved-thumb:focus-visible::after {
  content: '';
  position: absolute;
  inset: 0;
  box-shadow: inset 0 0 0 1px var(--box-shadow-color-progressive--focus, #36c);
}

.saved-thumb__image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/*
 * Mini title for items with no image: Codex's "Figure caption" size and weight
 * (14px, normal), with tighter letter and line spacing so three lines fit in
 * 64px, then an ellipsis; the full title shows on hover.
 */
.saved-thumb__text {
  display: -webkit-box;
  box-sizing: border-box;
  width: 100%;
  padding: var(--spacing-25, 4px);
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  color: var(--color-base, #202122);
  font-family: var(--font-family-base);
  font-size: var(--font-size-small, 14px);
  font-weight: var(--font-weight-normal, 400);
  line-height: 1.2;
  letter-spacing: -0.02em;
  /* Break long words with a proper hyphen ("Inter-stellar"); if that can't fit, break anyway. */
  hyphens: auto;
  overflow-wrap: break-word;
}

/* Passages: the excerpt, in serif like on their cards. */
.saved-thumb__text--quote {
  font-family: var(--font-family-serif, 'Linux Libertine', Georgia, serif);
}

.saved-thumb:has(.saved-thumb__text) {
  align-items: flex-start;
  background-color: var(--background-color-interactive-subtle, #f8f9fa);
}

/* ---- Compact (collection previews) ---- */
.saved-card--compact {
  min-height: 0;
  padding: var(--spacing-50, 8px);
}

.saved-card--compact .saved-card__image {
  aspect-ratio: 1 / 1;
  margin-bottom: var(--spacing-50, 8px);
}

.saved-card--compact .saved-card__text {
  -webkit-line-clamp: 2;
}

.saved-card--compact .saved-card__quote {
  -webkit-line-clamp: 4;
  font-size: var(--font-size-small, 14px);
}

/* ---- Mobile list row ---- */
.saved-row-wrap {
  padding-top: var(--spacing-75, 12px);
}

.saved-row-impact {
  margin: 0 0 var(--spacing-50, 8px);
}

.saved-row {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-75, 12px);
  padding: 0 0 var(--spacing-100, 16px);
  color: var(--color-base, #202122);
  text-decoration: none;
}

.saved-row-wrap:last-child .saved-row {
  padding-bottom: var(--spacing-100, 16px);
}

.saved-row__editing,
.saved-card__editing {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-75, 12px);
  margin-top: var(--spacing-50, 8px);
}

.saved-card__editing {
  margin-top: auto;
  padding-top: var(--spacing-50, 8px);
}

.saved-row__signal,
.saved-card__signal {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-25, 4px);
  color: var(--color-subtle, #54595d);
}

.saved-row__signal :deep(.cdx-icon),
.saved-card__signal :deep(.cdx-icon) {
  flex-shrink: 0;
  color: var(--color-subtle, #54595d);
}

.saved-row__thumb {
  flex-shrink: 0;
  box-sizing: border-box;
  width: 72px;
  height: 72px;
  border: 1px solid var(--border-color-subtle, #c8ccd1);
  object-fit: cover;
}

.saved-row__thumb--loading {
  background-color: var(--background-color-interactive-subtle, #f8f9fa);
}

.saved-row__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.saved-row__title {
  font-size: var(--font-size-medium, 16px);
  font-weight: var(--font-weight-bold, 700);
  line-height: var(--line-height-small, 1.375);
}

.saved-row__description {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  color: var(--color-subtle, #54595d);
  font-size: var(--font-size-small, 14px);
  line-height: var(--line-height-small, 1.571);
}

.saved-row__quote {
  display: -webkit-box;
  margin: 0;
  padding: 0;
  border: 0;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  font-family: var(--font-family-serif, 'Linux Libertine', Georgia, serif);
  font-size: var(--font-size-medium, 16px);
  line-height: var(--line-height-small, 1.375);
}

.saved-row__kind {
  margin-top: var(--spacing-25, 4px);
  padding-top: 0;
}

/* Mobile rows: no-image placeholder with the same footprint as a real thumbnail. */
.saved-row__thumb--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--background-color-interactive-subtle, #f8f9fa);
}

.saved-row__thumb--placeholder :deep(.cdx-icon) {
  color: var(--color-placeholder, #72777d);
}
</style>
