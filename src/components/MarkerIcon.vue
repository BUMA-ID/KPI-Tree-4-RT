<script setup lang="ts">
import { computed } from 'vue';
import {
  Circle, CheckCircle, Clock, Flag, Star, User,
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, ArrowDownRight, RefreshCw,
  Plus, Minus, HelpCircle, Info, X, Check, Pause, AlertTriangle
} from 'lucide-vue-next';
import { getMarkerById } from '../config/markers';

const props = defineProps<{
  markerId: string;
  size?: number;
  inheritColor?: boolean;
}>();

const size = computed(() => props.size ?? 10);
const markerInfo = computed(() => getMarkerById(props.markerId));
const category = computed(() => markerInfo.value?.category.id);
const option = computed(() => markerInfo.value?.option);

// Get icon component based on marker type
const iconComponent = computed(() => {
  if (!option.value) return null;

  const icon = option.value.icon;
  switch (icon) {
    case 'circle': return Circle;
    case 'check-circle': return CheckCircle;
    case 'clock-1':
    case 'clock-2':
    case 'clock-3':
    case 'clock-4':
    case 'clock-5':
    case 'clock-6':
    case 'clock-7': return Clock;
    case 'arrow-up': return ArrowUp;
    case 'arrow-down': return ArrowDown;
    case 'arrow-left': return ArrowLeft;
    case 'arrow-right': return ArrowRight;
    case 'arrow-up-right': return ArrowUpRight;
    case 'arrow-down-right': return ArrowDownRight;
    case 'refresh-cw': return RefreshCw;
    case 'plus': return Plus;
    case 'minus': return Minus;
    case 'help-circle': return HelpCircle;
    case 'info': return Info;
    case 'x': return X;
    case 'check': return Check;
    case 'pause': return Pause;
    case 'alert-triangle': return AlertTriangle;
    default: return null;
  }
});

// Check if this is a badge-style marker (priority, month, week)
const isBadge = computed(() => {
  return category.value === 'priority' || category.value === 'month' || category.value === 'week';
});

// Check if this marker type uses a specific icon
const isFlag = computed(() => category.value === 'flag');
const isStar = computed(() => category.value === 'star');
const isPeople = computed(() => category.value === 'people');
const isTask = computed(() => category.value === 'task');
const isArrow = computed(() => category.value === 'arrow');
const isSymbol = computed(() => category.value === 'symbol');
</script>

<template>
  <span v-if="markerInfo" class="inline-flex items-center justify-center flex-shrink-0" :title="option?.label">
    <!-- Badge style (priority, month, week) -->
    <span
      v-if="isBadge"
      class="inline-flex items-center justify-center rounded text-[8px] font-bold leading-none"
      :style="{
        backgroundColor: inheritColor ? 'currentColor' : option?.color,
        color: inheritColor ? 'inherit' : 'white',
        width: `${size + 4}px`,
        height: `${size + 2}px`,
        opacity: inheritColor ? 0.9 : 1,
      }"
    >
      <span :style="{ color: inheritColor ? 'var(--badge-text, white)' : 'white' }">
        {{ option?.label }}
      </span>
    </span>

    <!-- Flag -->
    <Flag
      v-else-if="isFlag"
      :size="size"
      :style="{ color: inheritColor ? 'inherit' : option?.color }"
    />

    <!-- Star -->
    <Star
      v-else-if="isStar"
      :size="size"
      :style="{ color: inheritColor ? 'inherit' : option?.color }"
      fill="currentColor"
    />

    <!-- People -->
    <User
      v-else-if="isPeople"
      :size="size"
      :style="{ color: inheritColor ? 'inherit' : option?.color }"
    />

    <!-- Task progress -->
    <component
      v-else-if="isTask && iconComponent"
      :is="iconComponent"
      :size="size"
      :style="{ color: inheritColor ? 'inherit' : '#22c55e' }"
    />

    <!-- Arrow -->
    <component
      v-else-if="isArrow && iconComponent"
      :is="iconComponent"
      :size="size"
      :style="{ color: inheritColor ? 'inherit' : '#3b82f6' }"
    />

    <!-- Symbol -->
    <component
      v-else-if="isSymbol && iconComponent"
      :is="iconComponent"
      :size="size"
      :style="{ color: inheritColor ? 'inherit' : option?.color }"
    />
  </span>
</template>
