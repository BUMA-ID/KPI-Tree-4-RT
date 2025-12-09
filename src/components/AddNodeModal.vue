<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { X } from 'lucide-vue-next';
import { useTreeStore } from '../composables/useTreeStore';
import type { ESGCategory, EmissionScope } from '../types';

const store = useTreeStore();

const isOpen = computed(() => store.modals.addNodeModal.open);
const parentName = computed(() => store.modals.addNodeModal.parentName);

const name = ref('');
const unit = ref('');
const esg = ref<ESGCategory | ''>('');
const scope = ref<EmissionScope | ''>('');

// Reset form when modal opens
watch(isOpen, (open) => {
  if (open) {
    name.value = '';
    unit.value = '';
    esg.value = '';
    scope.value = '';
  }
});

function handleSubmit() {
  if (!name.value.trim() || !store.modals.addNodeModal.parentId) return;

  store.addNode(store.modals.addNodeModal.parentId, {
    name: name.value.trim(),
    unit: unit.value.trim() || undefined,
    esg: esg.value || undefined,
    scope: scope.value || undefined,
  });
  store.closeAddNodeModal();
}

function handleClose() {
  store.closeAddNodeModal();
}
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    @click.self="handleClose"
  >
    <div class="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md">
      <div class="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <h2 class="text-sm font-semibold text-slate-900 dark:text-white">Add Child to "{{ parentName }}"</h2>
        <button
          @click="handleClose"
          class="p-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <X :size="16" />
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="p-4 space-y-4">
        <div>
          <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Name *</label>
          <input
            v-model="name"
            type="text"
            required
            autofocus
            class="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter node name"
          />
        </div>

        <div>
          <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Unit</label>
          <input
            v-model="unit"
            type="text"
            class="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., %, $, BCM"
          />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">ESG Category</label>
            <select
              v-model="esg"
              class="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">None</option>
              <option value="E">Environmental</option>
              <option value="S">Social</option>
              <option value="G">Governance</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Emission Scope</label>
            <select
              v-model="scope"
              class="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">None</option>
              <option :value="1">Scope 1 - Direct</option>
              <option :value="2">Scope 2 - Indirect</option>
              <option :value="3">Scope 3 - Value Chain</option>
            </select>
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <button
            type="button"
            @click="handleClose"
            class="px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-500 rounded-lg"
          >
            Add Node
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
