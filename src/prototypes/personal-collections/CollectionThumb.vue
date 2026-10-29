<script setup lang="ts">
/**
 * Square thumbnail for a collection: a 2×2 collage of the four most recently
 * added items that have an image, a single image when there are fewer, or a
 * placeholder when there are none.
 */
import { computed } from 'vue'
import { CdxIcon } from '@wikimedia/codex'
import { cdxIconImageGallery } from '@wikimedia/codex-icons'

import { useCollections, type SavedItem } from './useCollections'

const props = defineProps<{ collectionId: string }>()

const { itemsIn, summary } = useCollections()

function imageOf(item: SavedItem): string | null {
  if (item.kind === 'passage') return null
  if (item.kind === 'section' && item.imageUrl) return item.imageUrl
  return summary(item.title)?.thumbnailUrl ?? null
}

/** Newest-first images; itemsIn() already sorts by time added to the collection. */
const images = computed(() =>
  itemsIn(props.collectionId)
    .map(imageOf)
    .filter((url): url is string => !!url)
    .slice(0, 4),
)
</script>

<template>
  <span class="collection-thumb" aria-hidden="true">
    <span v-if="images.length >= 4" class="collection-thumb__collage">
      <img v-for="src in images" :key="src" :src="src" alt="" loading="lazy" />
    </span>
    <img v-else-if="images.length" class="collection-thumb__single" :src="images[0]" alt="" />
    <CdxIcon v-else :icon="cdxIconImageGallery" />
  </span>
</template>

<style scoped>
.collection-thumb {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 72px;
  height: 72px;
  overflow: hidden;
  border: 1px solid var(--border-color-subtle, #c8ccd1);
  background-color: var(--background-color-interactive-subtle, #f8f9fa);
}

.collection-thumb :deep(.cdx-icon) {
  color: var(--color-placeholder, #72777d);
}

.collection-thumb__collage {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 1px;
  width: 100%;
  height: 100%;
  background-color: var(--background-color-base, #fff);
}

.collection-thumb__collage img,
.collection-thumb__single {
  display: block;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  object-fit: cover;
}
</style>
