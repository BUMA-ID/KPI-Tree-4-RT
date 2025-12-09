import { ref, computed, watch } from 'vue';
import type { KPINode, TabState, PresetViewType } from '../types';
import { financialKPIs, operationalKPIs } from '../data/kpiData';
import { bumaKPIs } from '../data/bumaKpiData';
import { consolidatedKPIs } from '../data/consolidatedKpiData';

const STORAGE_KEY = 'kpi-tree-tabs';

// Preset tab definitions
const presetTabs: Record<PresetViewType, { name: string; getData: () => KPINode[] }> = {
  financial: { name: 'Financial', getData: () => JSON.parse(JSON.stringify(financialKPIs)) },
  operational: { name: 'Operational', getData: () => JSON.parse(JSON.stringify(operationalKPIs)) },
  buma: { name: 'BUMA', getData: () => JSON.parse(JSON.stringify(bumaKPIs)) },
  consolidated: { name: 'Consolidated', getData: () => JSON.parse(JSON.stringify(consolidatedKPIs)) },
};

function generateTabId(): string {
  return `tab-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function createPresetTab(presetType: PresetViewType): TabState {
  const preset = presetTabs[presetType];
  return {
    id: presetType,
    name: preset.name,
    isPreset: true,
    presetType,
    data: preset.getData(),
    expandedNodes: new Set<string>(),
    searchTerm: '',
    showESGOnly: false,
  };
}

// Serialize tab state for localStorage (convert Set to Array)
function serializeTabState(tab: TabState): object {
  return {
    ...tab,
    expandedNodes: Array.from(tab.expandedNodes),
  };
}

// Deserialize tab state from localStorage (convert Array to Set)
function deserializeTabState(obj: any): TabState {
  return {
    ...obj,
    expandedNodes: new Set(obj.expandedNodes || []),
  };
}

// Global state
const tabs = ref<TabState[]>([]);
const activeTabId = ref<string>('consolidated');

// Initialize with default preset tabs
function initializeTabs() {
  // Try to load from localStorage
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      tabs.value = parsed.tabs.map((t: any) => {
        // For preset tabs, reload fresh data
        if (t.isPreset && t.presetType && presetTabs[t.presetType as PresetViewType]) {
          const freshTab = createPresetTab(t.presetType as PresetViewType);
          // But preserve UI state
          freshTab.expandedNodes = new Set(t.expandedNodes || []);
          freshTab.searchTerm = t.searchTerm || '';
          freshTab.showESGOnly = t.showESGOnly || false;
          return freshTab;
        }
        return deserializeTabState(t);
      });
      activeTabId.value = parsed.activeTabId || 'consolidated';
      return;
    } catch (e) {
      console.warn('Failed to load tabs from localStorage', e);
    }
  }

  // Default initialization with preset tabs
  tabs.value = [
    createPresetTab('consolidated'),
    createPresetTab('financial'),
    createPresetTab('operational'),
    createPresetTab('buma'),
  ];
  activeTabId.value = 'consolidated';
}

// Save to localStorage
function saveTabs() {
  const toSave = {
    tabs: tabs.value.map(serializeTabState),
    activeTabId: activeTabId.value,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
}

// Watch for changes and auto-save
watch([tabs, activeTabId], () => {
  saveTabs();
}, { deep: true });

export function useTabManager() {
  // Computed
  const activeTab = computed(() => {
    return tabs.value.find(t => t.id === activeTabId.value) || tabs.value[0];
  });

  const presetTabsList = computed(() => {
    return tabs.value.filter(t => t.isPreset);
  });

  const customTabsList = computed(() => {
    return tabs.value.filter(t => !t.isPreset);
  });

  // Actions
  function setActiveTab(tabId: string) {
    if (tabs.value.some(t => t.id === tabId)) {
      activeTabId.value = tabId;
    }
  }

  function addNewTab(name: string, data: KPINode[]): string {
    const newTab: TabState = {
      id: generateTabId(),
      name,
      isPreset: false,
      data: JSON.parse(JSON.stringify(data)), // Deep clone
      expandedNodes: new Set<string>(),
      searchTerm: '',
      showESGOnly: false,
    };
    tabs.value.push(newTab);
    activeTabId.value = newTab.id;
    return newTab.id;
  }

  function duplicateTab(tabId: string, newName?: string): string | null {
    const sourceTab = tabs.value.find(t => t.id === tabId);
    if (!sourceTab) return null;

    const newTab: TabState = {
      id: generateTabId(),
      name: newName || `${sourceTab.name} (Copy)`,
      isPreset: false,
      data: JSON.parse(JSON.stringify(sourceTab.data)),
      expandedNodes: new Set(sourceTab.expandedNodes),
      searchTerm: sourceTab.searchTerm,
      showESGOnly: sourceTab.showESGOnly,
    };

    // Insert after the source tab
    const sourceIndex = tabs.value.findIndex(t => t.id === tabId);
    tabs.value.splice(sourceIndex + 1, 0, newTab);
    activeTabId.value = newTab.id;
    return newTab.id;
  }

  function closeTab(tabId: string) {
    const tab = tabs.value.find(t => t.id === tabId);
    if (!tab || tab.isPreset) return; // Can't close preset tabs

    const index = tabs.value.findIndex(t => t.id === tabId);
    tabs.value.splice(index, 1);

    // If closing active tab, switch to previous or next
    if (activeTabId.value === tabId) {
      const newIndex = Math.min(index, tabs.value.length - 1);
      activeTabId.value = tabs.value[newIndex]?.id || 'consolidated';
    }
  }

  function renameTab(tabId: string, newName: string) {
    const tab = tabs.value.find(t => t.id === tabId);
    if (tab && !tab.isPreset) {
      tab.name = newName;
    }
  }

  function updateTabData(tabId: string, data: KPINode[]) {
    const tab = tabs.value.find(t => t.id === tabId);
    if (tab) {
      tab.data = data;
    }
  }

  function updateTabExpandedNodes(tabId: string, expandedNodes: Set<string>) {
    const tab = tabs.value.find(t => t.id === tabId);
    if (tab) {
      tab.expandedNodes = expandedNodes;
    }
  }

  function updateTabSearchTerm(tabId: string, searchTerm: string) {
    const tab = tabs.value.find(t => t.id === tabId);
    if (tab) {
      tab.searchTerm = searchTerm;
    }
  }

  function updateTabShowESGOnly(tabId: string, showESGOnly: boolean) {
    const tab = tabs.value.find(t => t.id === tabId);
    if (tab) {
      tab.showESGOnly = showESGOnly;
    }
  }

  function resetPresetTab(presetType: PresetViewType) {
    const tab = tabs.value.find(t => t.presetType === presetType);
    if (tab) {
      const freshTab = createPresetTab(presetType);
      tab.data = freshTab.data;
      tab.expandedNodes = new Set();
      tab.searchTerm = '';
      tab.showESGOnly = false;
    }
  }

  function importToNewTab(name: string, data: KPINode[]): string {
    return addNewTab(name, data);
  }

  return {
    // State
    tabs,
    activeTabId,
    activeTab,
    presetTabsList,
    customTabsList,

    // Actions
    initializeTabs,
    setActiveTab,
    addNewTab,
    duplicateTab,
    closeTab,
    renameTab,
    updateTabData,
    updateTabExpandedNodes,
    updateTabSearchTerm,
    updateTabShowESGOnly,
    resetPresetTab,
    importToNewTab,
  };
}
