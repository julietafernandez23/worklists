<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { CdxDialog, CdxField, CdxTextInput } from '@wikimedia/codex'

import { useCollections, type Collection } from './useCollections'

const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ created: [collection: Collection] }>()

const { nameTaken, createCollection } = useCollections()

const name = ref('')
const inputRef = ref<InstanceType<typeof CdxTextInput> | null>(null)

const trimmed = computed(() => name.value.trim())
const duplicate = computed(() => trimmed.value.length > 0 && nameTaken(trimmed.value))
const canSave = computed(() => trimmed.value.length > 0 && !duplicate.value)

watch(open, async (isOpen) => {
  if (!isOpen) return
  name.value = ''
  await nextTick()
  inputRef.value?.focus()
})

function save() {
  if (!canSave.value) return
  const collection = createCollection(trimmed.value)
  open.value = false
  emit('created', collection)
}
</script>

<template>
  <CdxDialog
    v-model:open="open"
    class="create-collection-dialog"
    title="Name of the collection"
    :primary-action="{ label: 'Save', actionType: 'progressive', disabled: !canSave }"
    :default-action="{ label: 'Cancel' }"
    @primary="save"
    @default="open = false"
  >
    <!-- No browser autofill / history suggestions for a fresh collection name. -->
    <form autocomplete="off" @submit.prevent="save" @keydown.enter.prevent="save">
      <CdxField
        :status="duplicate ? 'error' : 'default'"
        :messages="{ error: 'You already have a collection with this name.' }"
        hide-label
      >
        <template #label>Name of the collection</template>
        <CdxTextInput
          ref="inputRef"
          v-model="name"
          placeholder="Enter name"
          name="pc-new-collection"
          autocomplete="off"
          autocorrect="off"
          spellcheck="false"
          data-1p-ignore
          data-lpignore="true"
          data-form-type="other"
        />
      </CdxField>
    </form>
  </CdxDialog>
</template>

<style scoped>
.create-collection-dialog :deep(.cdx-field) {
  margin-top: 0;
}
</style>
