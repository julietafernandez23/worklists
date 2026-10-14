<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { CdxButton, CdxIcon } from '@wikimedia/codex'
import { cdxIconCheck } from '@wikimedia/codex-icons'

const props = defineProps<{
  collectionName: string
  doneCount: number
  totalCount: number
  monthlyReads: number
}>()

const router = useRouter()

const doneLabel = computed(() => `${props.doneCount} of ${props.totalCount} done`)

const readsLabel = computed(() => {
  const count = props.monthlyReads
  if (count >= 1_000_000) {
    const millions = count / 1_000_000
    const rounded = millions >= 10 ? Math.round(millions) : Math.round(millions * 10) / 10
    return `${rounded} million`
  }
  return count.toLocaleString('en-US')
})

function startAnotherList() {
  router.push('/collections-view-modes')
}
</script>

<template>
  <section
    class="mme-completion-impact"
    aria-labelledby="mme-completion-impact-heading"
  >
    <div class="mme-completion-impact__badge" aria-hidden="true">
      <CdxIcon :icon="cdxIconCheck" size="large" />
    </div>

    <h2 id="mme-completion-impact-heading" class="mme-completion-impact__title">
      Nice work — you finished this list!
    </h2>

    <p class="mme-completion-impact__done">{{ doneLabel }}</p>

    <p class="mme-completion-impact__reads">
      The articles you improved in
      <span class="mme-completion-impact__collection">{{ collectionName }}</span>
      were read
      <span class="mme-completion-impact__reads-count">{{ readsLabel }}</span>
      times last month.
    </p>

    <CdxButton
      class="mme-completion-impact__cta"
      weight="primary"
      action="progressive"
      @click="startAnotherList"
    >
      Start another list
    </CdxButton>
  </section>
</template>

<style scoped>
.mme-completion-impact {
  margin-bottom: var(--spacing-150);
  padding: var(--spacing-150) var(--spacing-100);
  text-align: center;
  border: var(--border-width-base) solid var(--border-color-success, #14866d);
  border-radius: var(--border-radius-large);
  background: linear-gradient(
    165deg,
    var(--background-color-success-subtle, #d5fdf4) 0%,
    var(--background-color-base) 55%
  );
  box-shadow: 0 4px 24px rgba(20, 134, 109, 0.12);
}

.mme-completion-impact__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3.5rem;
  height: 3.5rem;
  margin: 0 auto var(--spacing-75);
  border-radius: 50%;
  background-color: var(--color-success, #14866d);
  color: var(--color-inverted, #fff);
}

.mme-completion-impact__badge :deep(.cdx-icon) {
  color: inherit;
}

.mme-completion-impact__title {
  margin: 0 0 var(--spacing-50);
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-x-large);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-x-large);
  color: var(--color-base);
}

.mme-completion-impact__done {
  margin: 0 0 var(--spacing-100);
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-xx-large);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-xx-large);
  color: var(--color-success, #14866d);
}

.mme-completion-impact__reads {
  margin: 0 0 var(--spacing-125);
  max-width: 22rem;
  margin-left: auto;
  margin-right: auto;
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-medium);
  color: var(--color-base);
}

.mme-completion-impact__collection {
  font-weight: var(--font-weight-bold);
}

.mme-completion-impact__reads-count {
  font-weight: var(--font-weight-bold);
  color: var(--color-success, #14866d);
}

.mme-completion-impact__cta {
  min-width: min(100%, 16rem);
  justify-content: center;
}
</style>
