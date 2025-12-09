<script setup lang="ts">
import { computed } from 'vue';
import { ChevronDown, ChevronRight, GripVertical, Link, Star } from 'lucide-vue-next';
import ESGBadge from './ESGBadge.vue';
import MarkerIcon from './MarkerIcon.vue';
import { useTreeStore } from '../composables/useTreeStore';
import { useTheme } from '../composables/useTheme';
import type { KPINode } from '../types';

const props = defineProps<{
  node: KPINode;
  level?: number;
  expandedNodes: Set<string>;
  searchTerm: string;
  showESGOnly: boolean;
  matchingIds?: Set<string>;
  ancestorIds?: Set<string>;
}>();

const emit = defineEmits<{
  toggle: [id: string];
}>();

const store = useTreeStore();
const { resolvedTheme } = useTheme();

// Level colors
const LEVEL_COLORS_LIGHT = [
  'bg-slate-600 border-slate-400 text-white',
  'bg-blue-500 border-blue-300 text-white',
  'bg-emerald-500 border-emerald-300 text-white',
  'bg-teal-500 border-teal-300 text-white',
  'bg-amber-400 border-amber-200 text-slate-900',
  'bg-orange-400 border-orange-200 text-slate-900',
  'bg-rose-400 border-rose-200 text-white',
  'bg-purple-400 border-purple-200 text-white',
  'bg-cyan-400 border-cyan-200 text-slate-900',
  'bg-lime-400 border-lime-200 text-slate-900',
];

const LEVEL_COLORS_DARK = [
  'bg-slate-800 border-slate-600 text-white',
  'bg-blue-700 border-blue-500 text-white',
  'bg-emerald-600 border-emerald-400 text-white',
  'bg-teal-500 border-teal-400 text-white',
  'bg-amber-500 border-amber-400 text-slate-900',
  'bg-orange-400 border-orange-300 text-slate-900',
  'bg-rose-300 border-rose-400 text-slate-800',
  'bg-slate-300 border-slate-400 text-slate-800',
  'bg-slate-200 border-slate-300 text-slate-700',
  'bg-slate-100 border-slate-200 text-slate-600',
];

const level = computed(() => props.level ?? 0);
const LEVEL_COLORS = computed(() => resolvedTheme.value === 'dark' ? LEVEL_COLORS_DARK : LEVEL_COLORS_LIGHT);

const hasChildren = computed(() => props.node.children && props.node.children.length > 0);
const isExpanded = computed(() => props.expandedNodes.has(props.node.id));
const isDragging = computed(() => store.draggedNodeId.value === props.node.id);
const isDropTarget = computed(() => store.dropTargetId.value === props.node.id);
const isSelected = computed(() => store.selectedNodeId.value === props.node.id);

const isSearchActive = computed(() => props.searchTerm && props.matchingIds && props.ancestorIds);
const isMatching = computed(() => props.matchingIds?.has(props.node.id));
const isAncestor = computed(() => props.ancestorIds?.has(props.node.id));
const bgColor = computed(() => LEVEL_COLORS.value[Math.min(level.value, LEVEL_COLORS.value.length - 1)]);

// Link mode
const isLinkSource = computed(() => store.linkingMode.value && store.linkSourceId.value === props.node.id);
const isLinkTarget = computed(() => store.linkingMode.value && store.linkSourceId.value !== props.node.id);

// Relationships
const hasRelationships = computed(() => props.node.relationships && props.node.relationships.length > 0);
const relationshipCount = computed(() => props.node.relationships?.length || 0);

// Markers (from XMind)
const markers = computed(() => props.node.markers || []);

// Check if detached
const isDetached = computed(() => props.node.isDetached);

// Check if node has ESG content
function hasESGContent(node: KPINode): boolean {
  if (node.esg || node.scope) return true;
  if (node.children) {
    return node.children.some(child => hasESGContent(child));
  }
  return false;
}

const shouldShow = computed(() => {
  // Filter for ESG-only view
  if (props.showESGOnly && !hasESGContent(props.node)) {
    return false;
  }
  // Filter for search
  if (isSearchActive.value && !isMatching.value && !isAncestor.value) {
    return false;
  }
  return true;
});

function handleClick() {
  // If in link mode, create the link to this node
  if (store.linkingMode.value) {
    const label = prompt('Enter relationship label (optional):') || undefined;
    store.createLink(props.node.id, label);
    return;
  }

  store.selectedNodeId.value = props.node.id;
  if (hasChildren.value) {
    emit('toggle', props.node.id);
  }
}

function handleContextMenu(event: MouseEvent) {
  event.preventDefault();
  event.stopPropagation();
  if (!store.isLocked.value) {
    store.openContextMenu(event.clientX, event.clientY, props.node.id, props.node.name);
  }
}

function handleDragStart(event: DragEvent) {
  if (store.isLocked.value) {
    event.preventDefault();
    return;
  }
  event.stopPropagation();
  store.draggedNodeId.value = props.node.id;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', props.node.id);
  }
  setTimeout(() => {
    const element = event.target as HTMLElement;
    element.style.opacity = '0.5';
  }, 0);
}

function handleDragEnd(event: DragEvent) {
  event.stopPropagation();
  store.draggedNodeId.value = null;
  store.dropTargetId.value = null;
  const element = event.target as HTMLElement;
  element.style.opacity = '1';
}

function handleDragOver(event: DragEvent) {
  event.preventDefault();
  event.stopPropagation();
  if (store.draggedNodeId.value === props.node.id) {
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'none';
    }
    return;
  }
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
  store.dropTargetId.value = props.node.id;
}

function handleDragLeave(event: DragEvent) {
  event.stopPropagation();
  const relatedTarget = event.relatedTarget as HTMLElement;
  if (!relatedTarget || !(event.currentTarget as HTMLElement).contains(relatedTarget)) {
    store.dropTargetId.value = null;
  }
}

function handleDrop(event: DragEvent) {
  event.preventDefault();
  event.stopPropagation();
  const draggedId = event.dataTransfer?.getData('text/plain');
  if (draggedId && draggedId !== props.node.id) {
    store.moveNode(draggedId, props.node.id);
  }
  store.draggedNodeId.value = null;
  store.dropTargetId.value = null;
}

const nodeClasses = computed(() => {
  const classes = [
    'flex items-center gap-1 p-1.5 rounded-lg border-2',
    bgColor.value,
    'hover:opacity-90 transition-all mb-0.5 shadow-sm group'
  ];

  if (isMatching.value) classes.push('ring-2 ring-yellow-400');
  if (isDragging.value) classes.push('opacity-50 scale-95');
  if (isDropTarget.value && !isDragging.value) classes.push('ring-2 ring-blue-400 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 scale-105');
  if (isSelected.value && !isDropTarget.value && !store.linkingMode.value) classes.push('ring-2 ring-cyan-400 dark:ring-cyan-500 ring-offset-1 ring-offset-white dark:ring-offset-slate-900');

  // Link mode styling
  if (isLinkSource.value) {
    classes.push('ring-2 ring-blue-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 animate-pulse');
  } else if (isLinkTarget.value) {
    classes.push('cursor-crosshair hover:ring-2 hover:ring-green-400 hover:ring-offset-1');
  }

  if (hasChildren.value) {
    classes.push('cursor-pointer');
  } else if (!isLinkTarget.value) {
    classes.push('cursor-default');
  }

  return classes.join(' ');
});
</script>

<template>
  <div v-if="shouldShow" class="flex flex-col" role="treeitem" :aria-expanded="hasChildren ? isExpanded : undefined">
    <div
      :class="nodeClasses"
      :data-node-id="node.id"
      @click="handleClick"
      @contextmenu="handleContextMenu"
      :draggable="!store.isLocked.value"
      @dragstart="handleDragStart"
      @dragend="handleDragEnd"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
      tabindex="0"
      role="treeitem"
      :aria-label="`${node.name}${node.unit ? `, ${node.unit}` : ''}${hasChildren ? `, ${isExpanded ? 'expanded' : 'collapsed'}` : ''}`"
    >
      <!-- Drag handle -->
      <span
        v-if="!store.isLocked.value"
        class="w-3 h-3 flex items-center justify-center flex-shrink-0 cursor-grab opacity-0 group-hover:opacity-50 transition-opacity"
        aria-hidden="true"
      >
        <GripVertical :size="10" />
      </span>

      <!-- Expand/collapse chevron -->
      <span v-if="hasChildren" class="w-3 h-3 flex items-center justify-center flex-shrink-0" aria-hidden="true">
        <ChevronDown v-if="isExpanded" :size="12" />
        <ChevronRight v-else :size="12" />
      </span>
      <span v-else class="w-3 flex-shrink-0" aria-hidden="true" />

      <!-- Node icon -->
      <component v-if="node.icon" :is="node.icon" :size="12" class="flex-shrink-0" aria-hidden="true" />

      <!-- Node content -->
      <div class="flex flex-col min-w-0 flex-1">
        <div class="flex items-center gap-1">
          <!-- Detached indicator -->
          <Star v-if="isDetached" :size="10" class="flex-shrink-0" style="color: inherit" title="Floating/detached topic" />
          <span class="font-medium text-xs leading-tight truncate">{{ node.name }}</span>
          <ESGBadge :type="node.esg" :scope="node.scope" />
          <!-- Relationship indicator -->
          <span
            v-if="hasRelationships"
            class="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-200"
            :title="`${relationshipCount} linked node${relationshipCount > 1 ? 's' : ''}`"
          >
            <Link :size="8" />
            {{ relationshipCount }}
          </span>
          <!-- Markers -->
          <MarkerIcon
            v-for="marker in markers"
            :key="marker"
            :marker-id="marker"
            :size="10"
            inherit-color
            class="flex-shrink-0"
          />
        </div>
        <span v-if="node.unit" class="text-xs opacity-75 leading-tight truncate">{{ node.unit }}</span>
      </div>
    </div>

    <!-- Children -->
    <div
      v-if="hasChildren && isExpanded"
      class="ml-3 pl-2 border-l-2 border-slate-300 dark:border-slate-600 flex flex-col gap-0.5"
      role="group"
      :aria-label="`${node.name} children`"
    >
      <TreeNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :level="level + 1"
        :expanded-nodes="expandedNodes"
        :search-term="searchTerm"
        :show-e-s-g-only="showESGOnly"
        :matching-ids="matchingIds"
        :ancestor-ids="ancestorIds"
        @toggle="emit('toggle', $event)"
      />
    </div>
  </div>
</template>
