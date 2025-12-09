<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { getAllRelationships } from '../utils/fileExport';
import { useTreeStore } from '../composables/useTreeStore';
import type { KPINode } from '../types';

const store = useTreeStore();

const props = defineProps<{
  treeData: KPINode[];
  containerRef: HTMLElement | null;
  enabled: boolean;
}>();

// Arrow colors
const ARROW_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
];

const svgWidth = ref(0);
const svgHeight = ref(0);

const arrowPaths = ref<Array<{
  id: string;
  path: string;
  color: string;
  colorIndex: number;
  label?: string;
  labelX: number;
  labelY: number;
}>>([]);

function updateArrows() {
  if (!props.containerRef || !props.enabled) {
    arrowPaths.value = [];
    return;
  }

  const container = props.containerRef;
  const containerRect = container.getBoundingClientRect();
  svgWidth.value = container.scrollWidth;
  svgHeight.value = container.scrollHeight;

  const relationships = getAllRelationships(props.treeData);
  const paths: typeof arrowPaths.value = [];

  relationships.forEach((rel, index) => {
    // Skip hidden relationships
    if (store.isRelationshipHidden(rel.source.id, rel.target.id)) return;

    const sourceEl = container.querySelector(`[data-node-id="${rel.source.id}"]`) as HTMLElement;
    const targetEl = container.querySelector(`[data-node-id="${rel.target.id}"]`) as HTMLElement;

    if (!sourceEl || !targetEl) return;

    const sourceRect = sourceEl.getBoundingClientRect();
    const targetRect = targetEl.getBoundingClientRect();

    // Calculate positions relative to container (accounting for scroll)
    const x1 = sourceRect.right - containerRect.left + container.scrollLeft;
    const y1 = sourceRect.top - containerRect.top + container.scrollTop + sourceRect.height / 2;
    const x2 = targetRect.right - containerRect.left + container.scrollLeft;
    const y2 = targetRect.top - containerRect.top + container.scrollTop + targetRect.height / 2;

    // Curve offset - make it swing much wider to the right for visibility
    const verticalDist = Math.abs(y2 - y1);
    const baseOffset = Math.min(150, Math.max(80, verticalDist * 0.4));
    const curveOffset = baseOffset + (index % 4) * 25;

    // Create bezier curve going to the right side with more space
    const path = `M ${x1 + 5} ${y1} C ${x1 + curveOffset} ${y1}, ${x2 + curveOffset} ${y2}, ${x2 + 5} ${y2}`;

    // Label position at the midpoint of the curve
    const labelX = Math.max(x1, x2) + curveOffset * 0.6;
    const labelY = (y1 + y2) / 2;

    const colorIndex = index % ARROW_COLORS.length;
    paths.push({
      id: `${rel.source.id}-${rel.target.id}`,
      path,
      color: ARROW_COLORS[colorIndex] as string,
      colorIndex,
      label: rel.label,
      labelX,
      labelY,
    });
  });

  arrowPaths.value = paths;
}

// Debounced update
let updateTimeout: ReturnType<typeof setTimeout> | null = null;
function debouncedUpdate() {
  if (updateTimeout) clearTimeout(updateTimeout);
  updateTimeout = setTimeout(updateArrows, 30);
}

// Watch for changes
watch(() => props.enabled, (enabled) => {
  if (enabled) {
    nextTick(() => setTimeout(updateArrows, 100));
  } else {
    arrowPaths.value = [];
  }
});

watch(() => props.treeData, debouncedUpdate, { deep: true });

// Watch for hidden relationships changes
watch(() => store.hiddenRelationships.value, debouncedUpdate, { deep: true });

watch(() => props.containerRef, (newRef, oldRef) => {
  if (oldRef) {
    oldRef.removeEventListener('scroll', debouncedUpdate);
  }
  if (newRef) {
    newRef.addEventListener('scroll', debouncedUpdate);
    // Use MutationObserver to detect DOM changes (expand/collapse)
    const observer = new MutationObserver(debouncedUpdate);
    observer.observe(newRef, { childList: true, subtree: true, attributes: true });

    if (props.enabled) {
      setTimeout(updateArrows, 100);
    }
  }
});

onMounted(() => {
  window.addEventListener('resize', debouncedUpdate);
  if (props.enabled && props.containerRef) {
    setTimeout(updateArrows, 200);
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', debouncedUpdate);
  if (props.containerRef) {
    props.containerRef.removeEventListener('scroll', debouncedUpdate);
  }
  if (updateTimeout) clearTimeout(updateTimeout);
});
</script>

<template>
  <svg
    v-if="enabled && arrowPaths.length > 0"
    class="absolute top-0 left-0 pointer-events-none"
    :width="svgWidth"
    :height="svgHeight"
    style="overflow: visible; z-index: 20;"
  >
    <defs>
      <marker
        v-for="(color, index) in ARROW_COLORS"
        :key="`marker-${index}`"
        :id="`tree-arrow-${index}`"
        markerWidth="10"
        markerHeight="7"
        refX="9"
        refY="3.5"
        orient="auto"
      >
        <polygon points="0 0, 10 3.5, 0 7" :fill="color" />
      </marker>
    </defs>

    <g v-for="arrow in arrowPaths" :key="arrow.id">
      <!-- Glow/shadow effect -->
      <path
        :d="arrow.path"
        fill="none"
        :stroke="arrow.color"
        stroke-width="6"
        stroke-opacity="0.15"
        stroke-linecap="round"
      />
      <!-- Main line -->
      <path
        :d="arrow.path"
        fill="none"
        :stroke="arrow.color"
        stroke-width="2.5"
        stroke-linecap="round"
        :marker-end="`url(#tree-arrow-${arrow.colorIndex})`"
      />
      <!-- Label if exists -->
      <g v-if="arrow.label">
        <rect
          :x="arrow.labelX - 2"
          :y="arrow.labelY - 8"
          :width="arrow.label.length * 5.5 + 6"
          height="16"
          rx="3"
          :fill="arrow.color"
          fill-opacity="0.9"
        />
        <text
          :x="arrow.labelX + 1"
          :y="arrow.labelY + 4"
          font-size="9"
          fill="white"
          font-weight="500"
        >
          {{ arrow.label }}
        </text>
      </g>
    </g>
  </svg>
</template>
