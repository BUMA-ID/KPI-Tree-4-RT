<script setup lang="ts">
import type { ESGCategory, EmissionScope } from '../types';

defineProps<{
  type?: ESGCategory;
  scope?: EmissionScope;
}>();
</script>

<template>
  <div class="flex items-center gap-0.5">
    <span
      v-if="type === 'E'"
      class="px-1 py-0.5 text-[10px] font-bold rounded bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 border border-green-500"
      title="Environmental"
    >
      E
    </span>
    <span
      v-if="type === 'S'"
      class="px-1 py-0.5 text-[10px] font-bold rounded bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 border border-purple-500"
      title="Social"
    >
      S
    </span>
    <span
      v-if="type === 'G'"
      class="px-1 py-0.5 text-[10px] font-bold rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-500"
      title="Governance"
    >
      G
    </span>
    <span
      v-if="scope === 1"
      class="px-1 py-0.5 text-[10px] font-bold rounded bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 border border-red-500"
      title="Scope 1 - Direct Emissions"
    >
      S1
    </span>
    <span
      v-if="scope === 2"
      class="px-1 py-0.5 text-[10px] font-bold rounded bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 border border-orange-500"
      title="Scope 2 - Indirect (Electricity)"
    >
      S2
    </span>
    <span
      v-if="scope === 3"
      class="px-1 py-0.5 text-[10px] font-bold rounded bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 border border-yellow-500"
      title="Scope 3 - Value Chain"
    >
      S3
    </span>
  </div>
</template>
