<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { Move, Plus, Edit, Copy, Trash2, Link, ChevronRight, X } from 'lucide-vue-next';
import { useTreeStore } from '../composables/useTreeStore';
import { MARKER_CATEGORIES } from '../config/markers';
import MarkerIcon from './MarkerIcon.vue';

const store = useTreeStore();

const isOpen = computed(() => store.contextMenu.nodeId !== '');

// Submenu state
const activeSubmenu = ref<string | null>(null);
const submenuPosition = ref({ x: 0, y: 0 });
const isHoveringTrigger = ref(false);
const isHoveringSubmenu = ref(false);
let hideTimeout: ReturnType<typeof setTimeout> | null = null;

// Get current node's markers
const currentNode = computed(() => store.findNodeById(store.contextMenu.nodeId));
const nodeMarkers = computed(() => currentNode.value?.markers || []);

function hasMarker(marker: string) {
  return nodeMarkers.value.includes(marker);
}

function hasAnyMarkerInCategory(categoryId: string) {
  const category = MARKER_CATEGORIES.find(c => c.id === categoryId);
  if (!category) return false;
  return category.options.some(opt => nodeMarkers.value.includes(opt.id));
}

function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement;
  if (!target.closest('.context-menu') && !target.closest('.submenu')) {
    store.closeContextMenu();
    activeSubmenu.value = null;
  }
}

// Reset submenu when context menu closes
watch(isOpen, (open) => {
  if (!open) {
    activeSubmenu.value = null;
  }
});

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  if (hideTimeout) clearTimeout(hideTimeout);
});

function handleMove() {
  store.openMoveModal(store.contextMenu.nodeId, store.contextMenu.nodeName);
}

function handleAddChild() {
  store.openAddNodeModal(store.contextMenu.nodeId, store.contextMenu.nodeName);
}

function handleEdit() {
  store.openEditNodeModal(store.contextMenu.nodeId);
}

function handleDuplicate() {
  store.duplicateNode(store.contextMenu.nodeId);
}

function handleDelete() {
  if (confirm(`Delete "${store.contextMenu.nodeName}" and all its children?`)) {
    store.deleteNode(store.contextMenu.nodeId);
  }
}

function handleCreateLink() {
  store.startLinkMode(store.contextMenu.nodeId, store.contextMenu.nodeName);
}

function handleToggleMarker(marker: string) {
  store.toggleMarker(store.contextMenu.nodeId, marker);
}

function handleClearMarkers() {
  // Clear all markers from this node
  const node = currentNode.value;
  if (node && node.markers) {
    node.markers.forEach(marker => {
      store.toggleMarker(store.contextMenu.nodeId, marker);
    });
  }
  activeSubmenu.value = null;
}

function showSubmenu(categoryId: string, event: MouseEvent) {
  if (hideTimeout) {
    clearTimeout(hideTimeout);
    hideTimeout = null;
  }
  const target = event.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  submenuPosition.value = {
    x: rect.right - 2, // Small overlap to prevent gap issues
    y: rect.top,
  };
  activeSubmenu.value = categoryId;
  isHoveringTrigger.value = true;
}

function onTriggerLeave(categoryId: string) {
  isHoveringTrigger.value = false;
  // Delay hide to allow moving to submenu
  hideTimeout = setTimeout(() => {
    if (!isHoveringSubmenu.value && activeSubmenu.value === categoryId) {
      activeSubmenu.value = null;
    }
  }, 150);
}

function onSubmenuEnter() {
  if (hideTimeout) {
    clearTimeout(hideTimeout);
    hideTimeout = null;
  }
  isHoveringSubmenu.value = true;
}

function onSubmenuLeave() {
  isHoveringSubmenu.value = false;
  // Delay hide to allow moving back to trigger
  hideTimeout = setTimeout(() => {
    if (!isHoveringTrigger.value) {
      activeSubmenu.value = null;
    }
  }, 150);
}
</script>

<template>
  <div
    v-if="isOpen"
    class="context-menu fixed z-50 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 py-1 min-w-[180px]"
    :style="{ left: `${store.contextMenu.x}px`, top: `${store.contextMenu.y}px` }"
  >
    <div class="px-3 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 truncate max-w-[200px]">
      {{ store.contextMenu.nodeName }}
    </div>

    <button
      @click="handleAddChild"
      class="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
    >
      <Plus :size="14" />
      Add Child
    </button>

    <button
      @click="handleEdit"
      class="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
    >
      <Edit :size="14" />
      Edit
    </button>

    <button
      @click="handleDuplicate"
      class="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
    >
      <Copy :size="14" />
      Duplicate
    </button>

    <button
      @click="handleMove"
      class="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
    >
      <Move :size="14" />
      Move to...
    </button>

    <div class="border-t border-slate-200 dark:border-slate-700 my-1" />

    <!-- Link Section -->
    <button
      @click="handleCreateLink"
      class="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
    >
      <Link :size="14" />
      Create Link...
    </button>

    <div class="border-t border-slate-200 dark:border-slate-700 my-1" />

    <!-- Markers Submenu Trigger -->
    <div class="relative">
      <template v-for="category in MARKER_CATEGORIES" :key="category.id">
        <button
          @mouseenter="showSubmenu(category.id, $event)"
          @mouseleave="onTriggerLeave(category.id)"
          :class="[
            'w-full flex items-center gap-2 px-3 py-1.5 text-xs',
            activeSubmenu === category.id
              ? 'bg-slate-100 dark:bg-slate-700'
              : '',
            hasAnyMarkerInCategory(category.id)
              ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
          ]"
        >
          <span class="flex-1 text-left">{{ category.label }}</span>
          <ChevronRight :size="12" />
        </button>
      </template>
    </div>

    <!-- Submenu (rendered outside the loop for better positioning) -->
    <template v-for="category in MARKER_CATEGORIES" :key="`submenu-${category.id}`">
      <Teleport to="body">
        <div
          v-if="activeSubmenu === category.id"
          class="submenu fixed z-[100] bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 py-1 min-w-[140px] max-h-[300px] overflow-y-auto"
          :style="{ left: `${submenuPosition.x}px`, top: `${submenuPosition.y}px` }"
          @mouseenter="onSubmenuEnter"
          @mouseleave="onSubmenuLeave"
        >
          <button
            v-for="option in category.options"
            :key="option.id"
            @click="handleToggleMarker(option.id)"
            :class="[
              'w-full flex items-center gap-2 px-3 py-1.5 text-xs',
              hasMarker(option.id)
                ? 'bg-blue-50 dark:bg-blue-900/30'
                : 'hover:bg-slate-100 dark:hover:bg-slate-700'
            ]"
          >
            <MarkerIcon :marker-id="option.id" :size="14" />
            <span class="flex-1 text-left text-slate-700 dark:text-slate-300">{{ option.label }}</span>
            <span v-if="hasMarker(option.id)" class="text-blue-500 text-[10px]">✓</span>
          </button>
        </div>
      </Teleport>
    </template>

    <!-- Clear Markers -->
    <button
      v-if="nodeMarkers.length > 0"
      @click="handleClearMarkers"
      class="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
    >
      <X :size="14" />
      Clear Markers
    </button>

    <div class="border-t border-slate-200 dark:border-slate-700 my-1" />

    <button
      @click="handleDelete"
      class="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
    >
      <Trash2 :size="14" />
      Delete
    </button>
  </div>
</template>
