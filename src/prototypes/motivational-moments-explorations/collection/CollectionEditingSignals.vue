<script setup lang="ts">
import { computed } from 'vue'
import { CdxIcon, CdxInfoChip, CdxTooltip } from '@wikimedia/codex'
import { cdxIconChartLine, cdxIconLightbulb } from '@wikimedia/codex-icons'
import {
  impactOpportunityLabel,
  otherSuggestedTaskCount,
  otherSuggestedTasksSuffix,
  primaryRecommendedTask,
  qualityBand,
  recommendedTaskTooltip,
  shortViewsLabel,
} from '@/lib/worklist-card-signals'

const vTooltip = CdxTooltip

const QUALITY_CHIP_STATUS = 'subtle' as const

export type CollectionArticleSignals = {
  viewsCount: number
  qualityScore: number
  suggestions: string[]
}

const props = defineProps<{
  article: CollectionArticleSignals
}>()

const primaryTask = computed(() => primaryRecommendedTask(props.article.suggestions))
const otherTaskCount = computed(() => otherSuggestedTaskCount(props.article.suggestions))
const otherTasksSuffix = computed(() => otherSuggestedTasksSuffix(otherTaskCount.value))
</script>

<template>
  <div class="mme-collection-signals">
    <div
      class="mme-collection-signals__chip"
      :class="`mme-collection-signals__chip--${qualityBand(props.article.qualityScore)}`"
    >
      <CdxInfoChip :status="QUALITY_CHIP_STATUS">
        {{ impactOpportunityLabel(props.article.qualityScore) }}
      </CdxInfoChip>
    </div>

    <div class="mme-collection-signals__meta">
      <div class="mme-collection-signals__meta-item">
        <CdxIcon
          :icon="cdxIconChartLine"
          size="small"
          class="mme-collection-signals__meta-icon mme-collection-signals__meta-icon--views"
        />
        <span class="mme-collection-signals__meta-text">
          {{ shortViewsLabel(props.article.viewsCount) }}
        </span>
      </div>

      <div v-if="primaryTask" class="mme-collection-signals__meta-item">
        <CdxIcon
          :icon="cdxIconLightbulb"
          size="small"
          class="mme-collection-signals__meta-icon mme-collection-signals__meta-icon--suggestion"
        />
        <span class="mme-collection-signals__meta-text mme-collection-signals__meta-text--suggestions">
          <span
            v-tooltip="recommendedTaskTooltip(primaryTask)"
            tabindex="0"
            class="mme-collection-signals__suggestion-text mme-collection-signals__suggestion-text--tooltip"
          >
            {{ primaryTask }}
          </span>
          <span
            v-if="otherTaskCount"
            class="mme-collection-signals__suggestion-remainder"
          >
            {{ otherTasksSuffix }}
          </span>
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mme-collection-signals {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50);
  margin-top: var(--spacing-35);
}

.mme-collection-signals__chip {
  min-width: 0;
}

.mme-collection-signals__chip:deep(.cdx-info-chip) {
  max-width: 100%;
}

.mme-collection-signals__chip:deep(.cdx-info-chip__text) {
  color: var(--color-base);
}

.mme-collection-signals__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-100);
}

.mme-collection-signals__meta-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-25);
  min-width: 0;
}

.mme-collection-signals__meta-icon {
  flex-shrink: 0;
}

.mme-collection-signals__meta-icon--views,
.mme-collection-signals__meta-icon--suggestion {
  color: var(--color-subtle);
}

.mme-collection-signals__meta-text {
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-small);
  color: var(--color-subtle);
}

.mme-collection-signals__meta-text--suggestions {
  color: var(--color-subtle);
}

.mme-collection-signals__suggestion-text {
  color: var(--color-subtle);
}

.mme-collection-signals__suggestion-text--tooltip {
  cursor: help;
  border-bottom: var(--border-width-base) dotted var(--border-color-subtle);
}

.mme-collection-signals__suggestion-remainder {
  color: var(--color-subtle);
  cursor: default;
}
</style>
