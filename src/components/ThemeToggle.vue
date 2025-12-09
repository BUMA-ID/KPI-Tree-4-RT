<script setup lang="ts">
import { Sun, Moon, Monitor } from 'lucide-vue-next';
import { useTheme } from '../composables/useTheme';

const { theme, setTheme } = useTheme();
</script>

<template>
  <div class="flex items-center bg-slate-200 dark:bg-slate-700 rounded-lg p-0.5">
    <button
      @click="setTheme('light')"
      :class="[
        'p-1.5 rounded-md transition-colors',
        theme === 'light'
          ? 'bg-white dark:bg-slate-600 text-amber-500 shadow-sm'
          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
      ]"
      title="Light mode"
      aria-label="Light mode"
      :aria-pressed="theme === 'light'"
    >
      <Sun :size="14" />
    </button>
    <button
      @click="setTheme('dark')"
      :class="[
        'p-1.5 rounded-md transition-colors',
        theme === 'dark'
          ? 'bg-white dark:bg-slate-600 text-blue-500 dark:text-blue-400 shadow-sm'
          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
      ]"
      title="Dark mode"
      aria-label="Dark mode"
      :aria-pressed="theme === 'dark'"
    >
      <Moon :size="14" />
    </button>
    <button
      @click="setTheme('system')"
      :class="[
        'p-1.5 rounded-md transition-colors',
        theme === 'system'
          ? 'bg-white dark:bg-slate-600 text-green-500 dark:text-green-400 shadow-sm'
          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
      ]"
      title="System preference"
      aria-label="System preference"
      :aria-pressed="theme === 'system'"
    >
      <Monitor :size="14" />
    </button>
  </div>
</template>
