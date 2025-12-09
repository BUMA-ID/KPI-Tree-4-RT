<script setup lang="ts">
import { ref, computed } from 'vue';
import { Link, ArrowRight, X, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-vue-next';
import { getAllRelationships } from '../utils/fileExport';
import { useTreeStore } from '../composables/useTreeStore';
import type { KPINode } from '../types';

const props = defineProps<{
  treeData: KPINode[];
  show: boolean;
}>();

const emit = defineEmits<{
  navigateTo: [id: string];
}>();

const store = useTreeStore();

// Panel collapsed state
const isCollapsed = ref(false);

// Color palette for different relationships
const COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
];

type RelationshipItem = { source: KPINode; target: KPINode; label?: string };

const relationships = computed(() => getAllRelationships(props.treeData));

// Group relationships by type/label for better organization
const groupedRelationships = computed(() => {
  const groups: Array<{ label: string; items: RelationshipItem[] }> = [];
  const groupMap = new Map<string, RelationshipItem[]>();

  for (const rel of relationships.value) {
    const key = rel.label || 'Related';
    if (!groupMap.has(key)) {
      groupMap.set(key, []);
    }
    groupMap.get(key)!.push(rel);
  }

  // Convert to array for template iteration
  for (const [label, items] of groupMap) {
    groups.push({ label, items });
  }

  return groups;
});

function handleNavigate(id: string) {
  emit('navigateTo', id);
}

function handleDeleteLink(sourceId: string, targetId: string, event: MouseEvent) {
  event.stopPropagation();
  if (confirm('Delete this relationship?')) {
    store.deleteLink(sourceId, targetId);
  }
}

function handleToggleVisibility(sourceId: string, targetId: string) {
  store.toggleRelationshipVisibility(sourceId, targetId);
}

function isHidden(sourceId: string, targetId: string): boolean {
  return store.isRelationshipHidden(sourceId, targetId);
}

// Check if all relationships are currently visible
const allVisible = computed(() => {
  return relationships.value.every(rel => !store.isRelationshipHidden(rel.source.id, rel.target.id));
});

// Toggle all relationships visibility
function toggleAllVisibility() {
  const shouldShow = !allVisible.value;
  relationships.value.forEach(rel => {
    const isCurrentlyHidden = store.isRelationshipHidden(rel.source.id, rel.target.id);
    if (shouldShow && isCurrentlyHidden) {
      store.toggleRelationshipVisibility(rel.source.id, rel.target.id);
    } else if (!shouldShow && !isCurrentlyHidden) {
      store.toggleRelationshipVisibility(rel.source.id, rel.target.id);
    }
  });
}

function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value;
}
</script>

<template>
  <div
    v-if="show"
    :class="[
      'flex flex-col bg-slate-50 dark:bg-slate-800/50 transition-all duration-200',
      isCollapsed ? 'h-auto' : 'h-full'
    ]"
  >
    <!-- Header (pinned) -->
    <div
      class="flex items-center gap-2 px-3 py-2 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 sticky top-0 z-10 flex-shrink-0 cursor-pointer select-none"
      @click="toggleCollapse"
    >
      <Link :size="14" class="text-blue-500 flex-shrink-0" />
      <span class="text-xs font-semibold text-slate-700 dark:text-slate-300">Relationships</span>
      <span class="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 text-[10px] rounded-full font-bold flex-shrink-0">
        {{ relationships.length }}
      </span>

      <!-- Toggle All Button -->
      <button
        v-if="relationships.length > 0"
        @click.stop="toggleAllVisibility"
        :class="[
          'p-1 rounded transition-colors flex-shrink-0',
          allVisible
            ? 'text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30'
            : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
        ]"
        :title="allVisible ? 'Hide all arrows' : 'Show all arrows'"
      >
        <Eye v-if="allVisible" :size="14" />
        <EyeOff v-else :size="14" />
      </button>

      <!-- Collapse/Expand Button -->
      <button
        class="ml-auto p-1 rounded text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex-shrink-0"
        :title="isCollapsed ? 'Expand panel' : 'Collapse panel'"
        @click.stop="toggleCollapse"
      >
        <ChevronUp v-if="!isCollapsed" :size="14" />
        <ChevronDown v-else :size="14" />
      </button>
    </div>

    <!-- Content (collapsible) -->
    <div
      v-show="!isCollapsed"
      class="flex-1 overflow-y-auto p-2 min-h-0"
    >
      <div v-if="relationships.length === 0" class="flex flex-col items-center justify-center h-full text-center p-4">
        <Link :size="24" class="text-slate-300 dark:text-slate-600 mb-2" />
        <p class="text-xs text-slate-500 dark:text-slate-400">No relationships</p>
        <p class="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Import XMind with links</p>
      </div>

      <!-- Relationship List View -->
      <div v-else class="space-y-2">
        <template v-for="group in groupedRelationships" :key="group.label">
          <!-- Group Label -->
          <div class="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide px-1 pt-2">
            {{ group.label }}
          </div>

          <!-- Relationships in group -->
          <div
            v-for="(rel, index) in group.items"
            :key="`${rel.source.id}-${rel.target.id}`"
            :class="[
              'rounded-lg p-2 border-2 transition-all relative group/card cursor-pointer',
              isHidden(rel.source.id, rel.target.id)
                ? 'bg-slate-100 dark:bg-slate-800/30 border-slate-300 dark:border-slate-600 opacity-50'
                : 'bg-white dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-500'
            ]"
            @click="handleToggleVisibility(rel.source.id, rel.target.id)"
            :title="isHidden(rel.source.id, rel.target.id) ? 'Click to show arrow' : 'Click to hide arrow'"
          >
            <!-- Hidden indicator -->
            <div
              v-if="isHidden(rel.source.id, rel.target.id)"
              class="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <div class="text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                HIDDEN
              </div>
            </div>
            <!-- Delete button -->
            <button
              @click="handleDeleteLink(rel.source.id, rel.target.id, $event)"
              class="absolute top-1 right-1 p-0.5 rounded opacity-0 group-hover/card:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 transition-all z-10"
              title="Delete relationship"
            >
              <X :size="12" />
            </button>
            <!-- Source Node -->
            <button
              @click.stop="handleNavigate(rel.source.id)"
              class="w-full text-left px-2 py-1 rounded bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors group relative z-10"
            >
              <div class="flex items-center gap-1">
                <div
                  class="w-2 h-2 rounded-full flex-shrink-0"
                  :style="{ backgroundColor: COLORS[index % COLORS.length] }"
                />
                <span class="text-[11px] font-medium text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                  {{ rel.source.name }}
                </span>
              </div>
              <span v-if="rel.source.unit" class="text-[9px] text-slate-400 pl-3 truncate block">
                {{ rel.source.unit }}
              </span>
            </button>

            <!-- Arrow -->
            <div class="flex items-center justify-center py-1">
              <div class="flex items-center gap-1 text-slate-400">
                <div class="h-px w-4 bg-current" />
                <ArrowRight :size="10" />
                <div class="h-px w-4 bg-current" />
              </div>
            </div>

            <!-- Target Node -->
            <button
              @click.stop="handleNavigate(rel.target.id)"
              class="w-full text-left px-2 py-1 rounded bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors group relative z-10"
            >
              <div class="flex items-center gap-1">
                <div
                  class="w-2 h-2 rounded-full flex-shrink-0"
                  :style="{ backgroundColor: COLORS[index % COLORS.length] }"
                />
                <span class="text-[11px] font-medium text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                  {{ rel.target.name }}
                </span>
              </div>
              <span v-if="rel.target.unit" class="text-[9px] text-slate-400 pl-3 truncate block">
                {{ rel.target.unit }}
              </span>
            </button>
          </div>
        </template>
      </div>
    </div>

    <!-- Footer hint (only when expanded) -->
    <div
      v-show="!isCollapsed && relationships.length > 0"
      class="px-2 py-1.5 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex-shrink-0"
    >
      <p class="text-[9px] text-slate-400 dark:text-slate-500 text-center">
        Click card to toggle arrow · Click node to navigate
      </p>
    </div>
  </div>
</template>
