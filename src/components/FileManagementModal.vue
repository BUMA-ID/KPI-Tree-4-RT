<script setup lang="ts">
import { ref } from 'vue';
import { X, FilePlus, Upload, Download } from 'lucide-vue-next';
import { useTreeStore } from '../composables/useTreeStore';
import { exportToJson, exportToXMind, importFromJson, importFromXMind, triggerFileInput } from '../utils/fileExport';
import type { KPINode } from '../types';

defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  close: [];
  newTree: [name: string, data: KPINode[]];
  import: [name: string, data: KPINode[]];
}>();

const store = useTreeStore();

type TabType = 'new' | 'import' | 'export';
const activeTab = ref<TabType>('new');

// New tree state
const newTreeName = ref('New KPI Tree');

// Export state
const exportFileName = ref('kpi-tree');
const exportFormat = ref<'json' | 'xmind'>('json');

// Import state
const importError = ref<string | null>(null);
const importSuccess = ref<string | null>(null);

const tabs: { id: TabType; label: string; icon: typeof FilePlus }[] = [
  { id: 'new', label: 'New', icon: FilePlus },
  { id: 'import', label: 'Import', icon: Upload },
  { id: 'export', label: 'Export', icon: Download },
];

function handleClose() {
  importError.value = null;
  importSuccess.value = null;
  emit('close');
}

// New tree - creates a new tab
function handleCreateNew() {
  const name = newTreeName.value || 'New KPI Tree';
  const newTree: KPINode[] = [{
    id: `root-${Date.now()}`,
    name: name,
    children: [],
  }];
  emit('newTree', name, newTree);
  newTreeName.value = 'New KPI Tree'; // Reset for next time
  handleClose();
}

// Export
async function handleExport() {
  const filename = exportFileName.value || 'kpi-tree';
  if (exportFormat.value === 'json') {
    exportToJson(store.treeData.value, `${filename}.json`);
  } else {
    await exportToXMind(store.treeData.value, `${filename}.xmind`);
  }
  handleClose();
}

// Import - creates a new tab with imported data
function handleImportJson() {
  triggerFileInput('.json', async (file) => {
    try {
      importError.value = null;
      importSuccess.value = null;
      const data = await importFromJson(file);
      // Extract name from filename (remove extension)
      const name = file.name.replace(/\.json$/i, '');
      emit('import', name, data);
      importSuccess.value = `Successfully imported ${file.name}`;
      setTimeout(() => handleClose(), 1000);
    } catch (err) {
      importError.value = err instanceof Error ? err.message : 'Failed to import JSON';
    }
  });
}

function handleImportXMind() {
  triggerFileInput('.xmind', async (file) => {
    try {
      importError.value = null;
      importSuccess.value = null;
      const data = await importFromXMind(file);
      // Extract name from filename (remove extension)
      const name = file.name.replace(/\.xmind$/i, '');
      emit('import', name, data);
      importSuccess.value = `Successfully imported ${file.name}`;
      setTimeout(() => handleClose(), 1000);
    } catch (err) {
      importError.value = err instanceof Error ? err.message : 'Failed to import XMind file';
    }
  });
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center"
    >
      <!-- Backdrop -->
      <div
        class="absolute inset-0 bg-black/50 backdrop-blur-sm"
        @click="handleClose"
      />

      <!-- Modal -->
      <div class="relative bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 class="text-lg font-semibold text-slate-900 dark:text-white">File Management</h2>
          <button
            @click="handleClose"
            class="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X :size="20" />
          </button>
        </div>

        <!-- Tabs -->
        <div class="flex border-b border-slate-200 dark:border-slate-700">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            :class="[
              'flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'text-amber-600 dark:text-amber-400 border-b-2 border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700/50'
            ]"
          >
            <component :is="tab.icon" :size="16" />
            {{ tab.label }}
          </button>
        </div>

        <!-- Content -->
        <div class="p-6">
          <!-- New Tab -->
          <div v-if="activeTab === 'new'" class="space-y-4">
            <p class="text-sm text-slate-600 dark:text-slate-400">
              Create a new empty KPI tree in a new tab.
            </p>

            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Tab / Root Node Name
              </label>
              <input
                v-model="newTreeName"
                type="text"
                placeholder="e.g., EBITDA, Revenue Tree"
                class="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>

            <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p class="text-sm text-blue-800 dark:text-blue-200">
                A new tab will be created. Your existing tabs will remain unchanged.
              </p>
            </div>

            <button
              @click="handleCreateNew"
              class="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors"
            >
              <FilePlus :size="18" />
              Create New Tab
            </button>
          </div>

          <!-- Import Tab -->
          <div v-if="activeTab === 'import'" class="space-y-4">
            <p class="text-sm text-slate-600 dark:text-slate-400">
              Import a KPI tree from a file into a new tab. Supported formats: JSON, XMind.
            </p>

            <!-- Error/Success messages -->
            <div
              v-if="importError"
              class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3"
            >
              <p class="text-sm text-red-800 dark:text-red-200">{{ importError }}</p>
            </div>
            <div
              v-if="importSuccess"
              class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3"
            >
              <p class="text-sm text-green-800 dark:text-green-200">{{ importSuccess }}</p>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <button
                @click="handleImportJson"
                class="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg hover:border-amber-400 dark:hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors group"
              >
                <Upload :size="24" class="text-slate-400 group-hover:text-amber-500" />
                <span class="text-sm font-medium text-slate-700 dark:text-slate-300">JSON File</span>
                <span class="text-xs text-slate-500 dark:text-slate-400">.json</span>
              </button>

              <button
                @click="handleImportXMind"
                class="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg hover:border-amber-400 dark:hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors group"
              >
                <Upload :size="24" class="text-slate-400 group-hover:text-amber-500" />
                <span class="text-sm font-medium text-slate-700 dark:text-slate-300">XMind File</span>
                <span class="text-xs text-slate-500 dark:text-slate-400">.xmind</span>
              </button>
            </div>

            <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p class="text-xs text-blue-800 dark:text-blue-200">
                <strong>Note:</strong> Imported data will be added as a new tab. XMind files must be in the newer Zen format.
              </p>
            </div>
          </div>

          <!-- Export Tab -->
          <div v-if="activeTab === 'export'" class="space-y-4">
            <p class="text-sm text-slate-600 dark:text-slate-400">
              Export your current KPI tree to a file that can be imported later.
            </p>

            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                File Name
              </label>
              <div class="flex gap-2">
                <input
                  v-model="exportFileName"
                  type="text"
                  placeholder="kpi-tree"
                  class="flex-1 px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
                <div class="px-3 py-2 bg-slate-100 dark:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-300 text-sm">
                  .{{ exportFormat }}
                </div>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Format
              </label>
              <div class="grid grid-cols-2 gap-3">
                <button
                  @click="exportFormat = 'json'"
                  :class="[
                    'flex flex-col items-center gap-1 p-3 border-2 rounded-lg transition-colors',
                    exportFormat === 'json'
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                      : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'
                  ]"
                >
                  <span class="text-sm font-medium text-slate-700 dark:text-slate-300">JSON</span>
                  <span class="text-xs text-slate-500 dark:text-slate-400">Full data preservation</span>
                </button>

                <button
                  @click="exportFormat = 'xmind'"
                  :class="[
                    'flex flex-col items-center gap-1 p-3 border-2 rounded-lg transition-colors',
                    exportFormat === 'xmind'
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                      : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'
                  ]"
                >
                  <span class="text-sm font-medium text-slate-700 dark:text-slate-300">XMind</span>
                  <span class="text-xs text-slate-500 dark:text-slate-400">Mind map compatible</span>
                </button>
              </div>
            </div>

            <div class="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
              <p class="text-xs text-slate-600 dark:text-slate-400">
                <strong>Export includes:</strong> Node names, IDs, units, ESG categories, emission scopes, and full tree structure.
              </p>
              <p class="text-xs text-slate-500 dark:text-slate-500 mt-1">
                <strong>Note:</strong> Icons are not exported but will be preserved for standard nodes.
              </p>
            </div>

            <button
              @click="handleExport"
              class="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors"
            >
              <Download :size="18" />
              Export to {{ exportFormat.toUpperCase() }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
