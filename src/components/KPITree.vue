<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { Lock, Unlock, Keyboard, FolderOpen, X, Copy, Link } from 'lucide-vue-next';
import ThemeToggle from './ThemeToggle.vue';
import TreeNode from './TreeNode.vue';
import ContextMenu from './ContextMenu.vue';
import AddNodeModal from './AddNodeModal.vue';
import EditNodeModal from './EditNodeModal.vue';
import FileManagementModal from './FileManagementModal.vue';
import RelationshipOverlay from './RelationshipOverlay.vue';
import RelationshipDiagram from './RelationshipDiagram.vue';
import { getAllRelationships } from '../utils/fileExport';
import { useTreeStore } from '../composables/useTreeStore';
import { useTabManager } from '../composables/useTabManager';
import { findMatchingNodesAndAncestors, collectAllIds } from '../composables/useTreeState';
import { useKeyboardShortcuts } from '../composables/useKeyboardShortcuts';
import { countNodes, countESG, countScope } from '../data/kpiData';
import type { KPINode } from '../types';

const store = useTreeStore();
const tabManager = useTabManager();

const showShortcuts = ref(false);
const showFileModal = ref(false);
const showRelationships = ref(false);
const editingTabId = ref<string | null>(null);
const editingTabName = ref('');
const treeContainerRef = ref<HTMLElement | null>(null);

// Count relationships for badge
const relationshipCount = computed(() => getAllRelationships(store.treeData.value).length);

// Initialize tab manager on mount
onMounted(() => {
  tabManager.initializeTabs();
  // Sync store with initial active tab
  if (tabManager.activeTab.value) {
    store.initStore(tabManager.activeTab.value.data, tabManager.activeTab.value.id);
  }
});

// Sync store when active tab changes
watch(() => tabManager.activeTabId.value, () => {
  const tab = tabManager.activeTab.value;
  if (tab) {
    store.initStore(tab.data, tab.id);
  }
});

// Sync tab data when store data changes (for edits)
watch(() => store.treeData.value, (newData) => {
  if (tabManager.activeTab.value && newData) {
    tabManager.updateTabData(tabManager.activeTabId.value, newData);
  }
}, { deep: true });

// Handle new tree creation from modal
function handleNewTree(name: string, data: KPINode[]) {
  tabManager.addNewTab(name, data);
}

// Handle import to new tab
function handleImport(name: string, data: KPINode[]) {
  tabManager.importToNewTab(name, data);
}

// Tab editing
function startEditingTab(tabId: string, currentName: string) {
  editingTabId.value = tabId;
  editingTabName.value = currentName;
}

function finishEditingTab() {
  if (editingTabId.value && editingTabName.value.trim()) {
    tabManager.renameTab(editingTabId.value, editingTabName.value.trim());
  }
  editingTabId.value = null;
  editingTabName.value = '';
}

function cancelEditingTab() {
  editingTabId.value = null;
  editingTabName.value = '';
}

// Get expanded nodes for current tab
const currentExpandedNodes = computed(() => {
  return tabManager.activeTab.value?.expandedNodes || new Set<string>();
});

const currentSearchTerm = computed(() => {
  return tabManager.activeTab.value?.searchTerm || '';
});

const currentShowESGOnly = computed(() => {
  return tabManager.activeTab.value?.showESGOnly || false;
});

// Update tab state functions
function toggleNode(id: string) {
  const tab = tabManager.activeTab.value;
  if (!tab) return;

  const newSet = new Set(tab.expandedNodes);
  if (newSet.has(id)) {
    newSet.delete(id);
  } else {
    newSet.add(id);
  }
  tabManager.updateTabExpandedNodes(tab.id, newSet);
}

function setSearchTerm(term: string) {
  const tab = tabManager.activeTab.value;
  if (tab) {
    tabManager.updateTabSearchTerm(tab.id, term);
  }
}

function setShowESGOnly(show: boolean) {
  const tab = tabManager.activeTab.value;
  if (tab) {
    tabManager.updateTabShowESGOnly(tab.id, show);
  }
}

function expandNodes(nodeIds: Set<string>) {
  const tab = tabManager.activeTab.value;
  if (!tab) return;

  const newSet = new Set(tab.expandedNodes);
  nodeIds.forEach(id => newSet.add(id));
  tabManager.updateTabExpandedNodes(tab.id, newSet);
}

function setExpandedNodesDirect(nodeIds: Set<string>) {
  const tab = tabManager.activeTab.value;
  if (tab) {
    tabManager.updateTabExpandedNodes(tab.id, nodeIds);
  }
}

function collapseAll() {
  const tab = tabManager.activeTab.value;
  if (tab) {
    tabManager.updateTabExpandedNodes(tab.id, new Set());
  }
}

function expandToLevel(targetLevel: number) {
  const tab = tabManager.activeTab.value;
  if (!tab) return;

  const ids: string[] = [];
  const collect = (items: KPINode[], level: number) => {
    items.forEach((node) => {
      if (level < targetLevel) {
        ids.push(node.id);
        if (node.children) {
          collect(node.children, level + 1);
        }
      }
    });
  };
  collect(tab.data, 0);
  tabManager.updateTabExpandedNodes(tab.id, new Set(ids));
}

// Search results
const searchResults = computed(() => {
  if (!currentSearchTerm.value) {
    return { matchingIds: new Set<string>(), ancestorIds: new Set<string>(), expandIds: new Set<string>() };
  }
  return findMatchingNodesAndAncestors(store.treeData.value, currentSearchTerm.value);
});

// Auto-expand when search changes
watch(currentSearchTerm, (term) => {
  if (term && searchResults.value.expandIds.size > 0) {
    expandNodes(searchResults.value.expandIds);
  }
});

// Expand functions that use current tree data
function expandAll() {
  if (store.treeData.value.length > 0) {
    const allIds = collectAllIds(store.treeData.value);
    setExpandedNodesDirect(new Set(allIds));
  }
}

// Use keyboard shortcuts
useKeyboardShortcuts({
  enabled: true,
  expandedNodes: currentExpandedNodes,
  treeData: store.treeData,
  onToggle: toggleNode,
});

// Statistics for current view
const currentViewCount = computed(() => countNodes(store.treeData.value));
const currentEsgE = computed(() => countESG(store.treeData.value, 'E'));
const currentEsgS = computed(() => countESG(store.treeData.value, 'S'));
const currentEsgG = computed(() => countESG(store.treeData.value, 'G'));
const currentScope1 = computed(() => countScope(store.treeData.value, 1));
const currentScope2 = computed(() => countScope(store.treeData.value, 2));
const currentScope3 = computed(() => countScope(store.treeData.value, 3));

// Navigate to a node by ID (used by relationships panel)
function navigateToNode(nodeId: string) {
  // Find all ancestor IDs to expand
  const ancestorIds = new Set<string>();

  function findAncestors(nodes: KPINode[], targetId: string, path: string[] = []): boolean {
    for (const node of nodes) {
      if (node.id === targetId) {
        path.forEach(id => ancestorIds.add(id));
        return true;
      }
      if (node.children) {
        if (findAncestors(node.children, targetId, [...path, node.id])) {
          return true;
        }
      }
    }
    return false;
  }

  findAncestors(store.treeData.value, nodeId);

  // Expand all ancestors
  if (ancestorIds.size > 0) {
    expandNodes(ancestorIds);
  }

  // Select the node
  store.selectedNodeId.value = nodeId;

  // Scroll to the node after a small delay for DOM update
  setTimeout(() => {
    const element = document.querySelector(`[aria-label*="${nodeId}"]`) ||
                    document.querySelector(`[data-node-id="${nodeId}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, 100);
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800 p-3 transition-colors">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <header class="mb-3">
        <div class="flex items-center justify-between mb-1">
          <h1 class="text-lg font-bold text-slate-900 dark:text-white">
            Open Cut Coal Mining Contractor - KPI Tree with ESG
          </h1>
          <div class="flex items-center gap-2">
            <!-- File Management Button -->
            <button
              @click="showFileModal = true"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600"
              title="File management (New, Import, Export)"
            >
              <FolderOpen :size="14" />
              File
            </button>

            <!-- Relationships Toggle Button -->
            <button
              @click="showRelationships = !showRelationships"
              :class="[
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                showRelationships
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
              ]"
              title="Toggle relationships panel"
            >
              <Link :size="14" />
              Links
              <span
                v-if="relationshipCount > 0"
                :class="[
                  'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                  showRelationships
                    ? 'bg-white/20 text-white'
                    : 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
                ]"
              >
                {{ relationshipCount }}
              </span>
            </button>

            <!-- Theme Toggle -->
            <ThemeToggle />

            <!-- Keyboard Shortcuts Button -->
            <div class="relative">
              <button
                @click="showShortcuts = !showShortcuts"
                :class="[
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  showShortcuts
                    ? 'bg-cyan-500 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                ]"
                title="Keyboard shortcuts"
              >
                <Keyboard :size="14" />
              </button>

              <!-- Shortcuts Tooltip -->
              <div
                v-if="showShortcuts"
                class="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 p-3 z-50"
              >
                <h3 class="font-bold text-sm text-slate-900 dark:text-white mb-2">Keyboard Shortcuts</h3>
                <p class="text-xs text-slate-500 dark:text-slate-400 mb-2">
                  Click a node to select, then use shortcuts (unlock to edit)
                </p>
                <div class="space-y-1 text-xs">
                  <div class="flex justify-between text-slate-700 dark:text-slate-300">
                    <span>Navigate</span>
                    <span class="font-mono bg-slate-100 dark:bg-slate-700 px-1 rounded">Arrow keys</span>
                  </div>
                  <div class="flex justify-between text-slate-700 dark:text-slate-300">
                    <span>Toggle expand</span>
                    <span class="font-mono bg-slate-100 dark:bg-slate-700 px-1 rounded">Space</span>
                  </div>
                  <div class="border-t border-slate-200 dark:border-slate-600 my-1" />
                  <div class="flex justify-between text-slate-700 dark:text-slate-300">
                    <span>Add sibling after</span>
                    <span class="font-mono bg-slate-100 dark:bg-slate-700 px-1 rounded">Enter</span>
                  </div>
                  <div class="flex justify-between text-slate-700 dark:text-slate-300">
                    <span>Add sibling before</span>
                    <span class="font-mono bg-slate-100 dark:bg-slate-700 px-1 rounded">Shift+Enter</span>
                  </div>
                  <div class="flex justify-between text-slate-700 dark:text-slate-300">
                    <span>Add child</span>
                    <span class="font-mono bg-slate-100 dark:bg-slate-700 px-1 rounded">Tab</span>
                  </div>
                  <div class="flex justify-between text-slate-700 dark:text-slate-300">
                    <span>Edit node</span>
                    <span class="font-mono bg-slate-100 dark:bg-slate-700 px-1 rounded">F2</span>
                  </div>
                  <div class="flex justify-between text-slate-700 dark:text-slate-300">
                    <span>Delete node</span>
                    <span class="font-mono bg-slate-100 dark:bg-slate-700 px-1 rounded">Delete</span>
                  </div>
                  <div class="flex justify-between text-slate-700 dark:text-slate-300">
                    <span>Deselect</span>
                    <span class="font-mono bg-slate-100 dark:bg-slate-700 px-1 rounded">Esc</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Lock/Unlock Toggle -->
            <button
              @click="store.toggleLock"
              :class="[
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                store.isLocked.value
                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                  : 'bg-amber-600 text-white hover:bg-amber-500 ring-2 ring-amber-400 ring-offset-2 ring-offset-white dark:ring-offset-slate-900'
              ]"
              :aria-pressed="!store.isLocked.value"
              :title="store.isLocked.value ? 'Click to unlock editing' : 'Click to lock'"
            >
              <template v-if="store.isLocked.value">
                <Lock :size="14" />
                Locked
              </template>
              <template v-else>
                <Unlock :size="14" />
                Unlocked - Editing Enabled
              </template>
            </button>
          </div>
        </div>

        <p class="text-slate-600 dark:text-slate-400 text-xs mb-2">
          {{ currentViewCount }} metrics in current view
          <span v-if="!store.isLocked.value" class="ml-2 text-amber-400">
            | Right-click to edit nodes or drag & drop
          </span>
        </p>

        <!-- Tab Bar -->
        <div class="flex items-center gap-1 mb-2 overflow-x-auto pb-1">
          <!-- Preset Tabs -->
          <template v-for="tab in tabManager.presetTabsList.value" :key="tab.id">
            <button
              @click="tabManager.setActiveTab(tab.id)"
              :class="[
                'flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-xs font-medium transition-colors whitespace-nowrap',
                tabManager.activeTabId.value === tab.id
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-t border-l border-r border-slate-200 dark:border-slate-700'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600'
              ]"
            >
              {{ tab.name }}
            </button>
          </template>

          <!-- Separator if there are custom tabs -->
          <div v-if="tabManager.customTabsList.value.length > 0" class="h-5 w-px bg-slate-300 dark:bg-slate-600 mx-1" />

          <!-- Custom Tabs -->
          <template v-for="tab in tabManager.customTabsList.value" :key="tab.id">
            <div
              :class="[
                'flex items-center gap-1 px-2 py-1.5 rounded-t-lg text-xs font-medium transition-colors group',
                tabManager.activeTabId.value === tab.id
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-t border-l border-r border-slate-200 dark:border-slate-700'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600'
              ]"
            >
              <!-- Tab name (editable) -->
              <template v-if="editingTabId === tab.id">
                <input
                  v-model="editingTabName"
                  @blur="finishEditingTab"
                  @keydown.enter="finishEditingTab"
                  @keydown.escape="cancelEditingTab"
                  class="w-24 px-1 py-0.5 text-xs bg-white dark:bg-slate-700 border border-amber-400 rounded focus:outline-none"
                  autofocus
                />
              </template>
              <template v-else>
                <button
                  @click="tabManager.setActiveTab(tab.id)"
                  @dblclick="startEditingTab(tab.id, tab.name)"
                  class="whitespace-nowrap"
                >
                  {{ tab.name }}
                </button>
              </template>

              <!-- Duplicate button -->
              <button
                @click.stop="tabManager.duplicateTab(tab.id)"
                class="p-0.5 rounded hover:bg-slate-300 dark:hover:bg-slate-600 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Duplicate tab"
              >
                <Copy :size="12" />
              </button>

              <!-- Close button -->
              <button
                @click.stop="tabManager.closeTab(tab.id)"
                class="p-0.5 rounded hover:bg-red-200 dark:hover:bg-red-900 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Close tab"
              >
                <X :size="12" />
              </button>
            </div>
          </template>
        </div>

        <!-- ESG Summary Bar -->
        <div class="flex flex-wrap gap-2 mb-2 text-xs" role="region" aria-label="ESG and Scope Statistics">
          <div class="bg-green-100 dark:bg-green-900/50 border border-green-500 rounded px-2 py-1 text-green-700 dark:text-green-300">
            <span class="font-bold">E</span> Environmental: {{ currentEsgE }}
          </div>
          <div class="bg-purple-100 dark:bg-purple-900/50 border border-purple-500 rounded px-2 py-1 text-purple-700 dark:text-purple-300">
            <span class="font-bold">S</span> Social: {{ currentEsgS }}
          </div>
          <div class="bg-blue-100 dark:bg-blue-900/50 border border-blue-500 rounded px-2 py-1 text-blue-700 dark:text-blue-300">
            <span class="font-bold">G</span> Governance: {{ currentEsgG }}
          </div>
          <div class="h-5 w-px bg-slate-300 dark:bg-slate-600" aria-hidden="true" />
          <div class="bg-red-100 dark:bg-red-900/50 border border-red-500 rounded px-2 py-1 text-red-700 dark:text-red-300">
            <span class="font-bold">S1</span> Scope 1: {{ currentScope1 }}
          </div>
          <div class="bg-orange-100 dark:bg-orange-900/50 border border-orange-500 rounded px-2 py-1 text-orange-700 dark:text-orange-300">
            <span class="font-bold">S2</span> Scope 2: {{ currentScope2 }}
          </div>
          <div class="bg-yellow-100 dark:bg-yellow-900/50 border border-yellow-500 rounded px-2 py-1 text-yellow-700 dark:text-yellow-300">
            <span class="font-bold">S3</span> Scope 3: {{ currentScope3 }}
          </div>
        </div>

        <!-- Link Mode Banner -->
        <div
          v-if="store.linkingMode.value"
          class="flex items-center gap-2 mb-2 p-2 bg-blue-100 dark:bg-blue-900/50 border border-blue-400 dark:border-blue-500 rounded-lg text-blue-700 dark:text-blue-300 text-xs animate-pulse"
          role="alert"
        >
          <Link :size="14" />
          <span class="font-bold">Link Mode:</span>
          <span>Click on another node to create a link from "{{ store.linkSourceName.value }}"</span>
          <button
            @click="store.cancelLinkMode"
            class="ml-auto px-2 py-0.5 bg-blue-200 dark:bg-blue-800 hover:bg-blue-300 dark:hover:bg-blue-700 rounded text-xs text-blue-800 dark:text-blue-200"
          >
            Cancel
          </button>
        </div>

        <!-- Move Error Message -->
        <div
          v-if="store.moveError.value"
          class="flex items-center gap-2 mb-2 p-2 bg-red-100 dark:bg-red-900/50 border border-red-400 dark:border-red-500 rounded-lg text-red-700 dark:text-red-300 text-xs"
          role="alert"
        >
          <span class="font-bold">Invalid Move:</span>
          <span>{{ store.moveError.value }}</span>
          <button
            @click="store.clearMoveError"
            class="ml-auto px-2 py-0.5 bg-red-200 dark:bg-red-800 hover:bg-red-300 dark:hover:bg-red-700 rounded text-xs text-red-800 dark:text-red-200"
          >
            Dismiss
          </button>
        </div>

        <!-- Controls -->
        <nav class="flex flex-wrap gap-2 mb-2" aria-label="Tree controls">
          <!-- ESG Filter -->
          <button
            @click="setShowESGOnly(!currentShowESGOnly)"
            :class="[
              'px-2 py-1 rounded text-xs',
              currentShowESGOnly
                ? 'bg-green-600 text-white'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            ]"
            :aria-pressed="currentShowESGOnly"
          >
            {{ currentShowESGOnly ? 'ESG Only' : 'Show All' }}
          </button>

          <div class="h-6 w-px bg-slate-300 dark:bg-slate-600 mx-1" aria-hidden="true" />

          <!-- Expand Controls -->
          <div role="group" aria-label="Expansion controls" class="flex flex-wrap gap-1">
            <button @click="expandToLevel(1)" class="px-2 py-1 bg-blue-500 dark:bg-blue-700 text-white rounded text-xs hover:bg-blue-600">L2</button>
            <button @click="expandToLevel(2)" class="px-2 py-1 bg-emerald-500 dark:bg-emerald-600 text-white rounded text-xs hover:bg-emerald-600">L3</button>
            <button @click="expandToLevel(3)" class="px-2 py-1 bg-teal-500 text-white rounded text-xs hover:bg-teal-600">L4</button>
            <button @click="expandToLevel(4)" class="px-2 py-1 bg-amber-400 dark:bg-amber-500 text-slate-900 rounded text-xs hover:bg-amber-500">L5</button>
            <button @click="expandToLevel(5)" class="px-2 py-1 bg-orange-400 text-slate-900 rounded text-xs hover:bg-orange-500">L6</button>
            <button @click="expandToLevel(6)" class="px-2 py-1 bg-rose-400 dark:bg-rose-300 text-white dark:text-slate-800 rounded text-xs hover:bg-rose-500">L7</button>
            <button @click="expandToLevel(7)" class="px-2 py-1 bg-purple-400 dark:bg-slate-300 text-white dark:text-slate-800 rounded text-xs hover:bg-purple-500">L8</button>
            <button @click="expandToLevel(8)" class="px-2 py-1 bg-cyan-400 dark:bg-slate-200 text-slate-900 rounded text-xs hover:bg-cyan-500">L9</button>
            <button @click="expandAll" class="px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-xs hover:bg-slate-300">All</button>
            <button @click="collapseAll" class="px-2 py-1 bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-slate-300 rounded text-xs hover:bg-slate-400">Collapse</button>
          </div>

          <div class="flex-1" />

          <!-- Search -->
          <div>
            <label for="kpi-search" class="sr-only">Search KPIs</label>
            <input
              id="kpi-search"
              type="text"
              placeholder="Search..."
              :value="currentSearchTerm"
              @input="setSearchTerm(($event.target as HTMLInputElement).value)"
              class="px-2 py-1 bg-white dark:bg-slate-700 text-slate-900 dark:text-white border border-slate-300 dark:border-transparent rounded text-xs w-32 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </nav>
      </header>

      <!-- Tree View with optional Relationships Panel -->
      <div class="flex gap-0 max-h-[75vh]">
        <!-- Tree Panel with Relationship Arrows Overlay -->
        <main
          ref="treeContainerRef"
          :class="[
            'bg-white dark:bg-slate-800 shadow-lg p-3 border border-slate-200 dark:border-slate-700 overflow-y-auto transition-all relative',
            !store.isLocked.value ? 'border-amber-500/50 dark:border-amber-500/50' : '',
            showRelationships ? 'w-3/4 rounded-l-xl border-r-0 pr-[180px]' : 'w-full rounded-xl'
          ]"
          role="tree"
          :aria-label="`${tabManager.activeTab.value?.name || 'KPI'} Tree`"
        >
          <!-- Relationship Arrows Overlay (drawn on top of tree nodes) -->
          <RelationshipOverlay
            :tree-data="store.treeData.value"
            :container-ref="treeContainerRef"
            :enabled="showRelationships"
          />

          <div class="flex flex-col gap-1">
            <template v-if="store.treeData.value && store.treeData.value.length > 0">
              <TreeNode
                v-for="node in store.treeData.value"
                :key="node.id"
                :node="node"
                :expanded-nodes="currentExpandedNodes"
                :search-term="currentSearchTerm"
                :show-e-s-g-only="currentShowESGOnly"
                :matching-ids="searchResults.matchingIds"
                :ancestor-ids="searchResults.ancestorIds"
                @toggle="toggleNode"
              />
            </template>
            <div v-else class="text-slate-500 dark:text-slate-400 text-sm p-4 text-center">
              No data. Use File > New to create a tree or File > Import to load data.
            </div>
          </div>
        </main>

        <!-- Relationships List Panel (right side) -->
        <aside
          v-if="showRelationships"
          class="w-1/4 min-w-[200px] bg-white dark:bg-slate-800 rounded-r-xl shadow-lg border border-slate-200 dark:border-slate-700 border-l-0 overflow-hidden"
        >
          <RelationshipDiagram
            :tree-data="store.treeData.value"
            :show="showRelationships"
            @navigate-to="navigateToNode"
          />
        </aside>
      </div>

      <!-- Scope Definitions Footer -->
      <footer class="mt-3">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs" role="region" aria-label="GHG Emission Scope Definitions">
          <div class="bg-red-50 dark:bg-red-900/30 rounded-lg p-2 border border-red-300 dark:border-red-800">
            <div class="text-red-600 dark:text-red-400 font-bold mb-1">Scope 1 - Direct</div>
            <ul class="text-slate-600 dark:text-slate-300 space-y-0.5 list-disc list-inside">
              <li>Diesel combustion (fleet, support, LV)</li>
              <li>Generator fuel</li>
              <li>Explosives detonation</li>
              <li>Fugitive emissions</li>
            </ul>
          </div>
          <div class="bg-orange-50 dark:bg-orange-900/30 rounded-lg p-2 border border-orange-300 dark:border-orange-800">
            <div class="text-orange-600 dark:text-orange-400 font-bold mb-1">Scope 2 - Indirect (Electricity)</div>
            <ul class="text-slate-600 dark:text-slate-300 space-y-0.5 list-disc list-inside">
              <li>Grid power - Camp/Office</li>
              <li>Grid power - Workshop</li>
              <li>Grid power - Conveyors/Crusher</li>
              <li>Purchased electricity</li>
            </ul>
          </div>
          <div class="bg-yellow-50 dark:bg-yellow-900/30 rounded-lg p-2 border border-yellow-400 dark:border-yellow-800">
            <div class="text-yellow-600 dark:text-yellow-400 font-bold mb-1">Scope 3 - Value Chain</div>
            <ul class="text-slate-600 dark:text-slate-300 space-y-0.5 list-disc list-inside">
              <li>Fuel production & transport</li>
              <li>Equipment/Tyre/Parts manufacturing</li>
              <li>Coal transport & combustion</li>
              <li>Employee commute, business travel</li>
            </ul>
          </div>
        </div>

        <p class="mt-2 text-xs text-slate-500">
          <strong>Note:</strong> For mining contractors, Scope 1 (diesel) typically represents
          85-95% of operational emissions. Scope 3 downstream (coal combustion) is often excluded
          from contractor reporting but may be disclosed separately.
        </p>
      </footer>
    </div>

    <!-- Modals -->
    <ContextMenu />
    <AddNodeModal />
    <EditNodeModal />
    <FileManagementModal
      :open="showFileModal"
      @close="showFileModal = false"
      @new-tree="handleNewTree"
      @import="handleImport"
    />
  </div>
</template>
