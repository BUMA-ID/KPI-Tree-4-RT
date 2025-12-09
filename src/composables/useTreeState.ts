import { ref } from 'vue';
import type { KPINode, ViewType } from '../types';

// Collect all IDs from tree
export function collectAllIds(nodes: KPINode[]): string[] {
  const ids: string[] = [];
  const traverse = (items: KPINode[]) => {
    for (const node of items) {
      ids.push(node.id);
      if (node.children) {
        traverse(node.children);
      }
    }
  };
  traverse(nodes);
  return ids;
}

// Find matching nodes and their ancestors
export function findMatchingNodesAndAncestors(
  nodes: KPINode[],
  searchTerm: string
): { matchingIds: Set<string>; ancestorIds: Set<string>; expandIds: Set<string> } {
  const matchingIds = new Set<string>();
  const ancestorIds = new Set<string>();
  const expandIds = new Set<string>();
  const lowerSearch = searchTerm.toLowerCase();

  const traverse = (items: KPINode[], ancestors: string[]) => {
    for (const node of items) {
      const nameMatch = node.name.toLowerCase().includes(lowerSearch);
      const unitMatch = node.unit?.toLowerCase().includes(lowerSearch);

      if (nameMatch || unitMatch) {
        matchingIds.add(node.id);
        ancestors.forEach(id => {
          ancestorIds.add(id);
          expandIds.add(id);
        });
      }

      if (node.children) {
        traverse(node.children, [...ancestors, node.id]);
      }
    }
  };

  traverse(nodes, []);
  return { matchingIds, ancestorIds, expandIds };
}

export function useTreeState() {
  const expandedNodes = ref<Set<string>>(new Set());
  const searchTerm = ref('');
  const showESGOnly = ref(false);
  const activeView = ref<ViewType>('consolidated');

  function toggleNode(id: string) {
    const newSet = new Set(expandedNodes.value);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    expandedNodes.value = newSet;
  }

  function expandAll(nodes: KPINode[]) {
    const allIds = collectAllIds(nodes);
    expandedNodes.value = new Set(allIds);
  }

  function collapseAll() {
    expandedNodes.value = new Set();
  }

  function expandToLevel(nodes: KPINode[], targetLevel: number) {
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
    collect(nodes, 0);
    expandedNodes.value = new Set(ids);
  }

  function expandNodes(nodeIds: Set<string>) {
    const newSet = new Set(expandedNodes.value);
    nodeIds.forEach(id => newSet.add(id));
    expandedNodes.value = newSet;
  }

  function setExpandedNodesDirect(nodeIds: Set<string>) {
    expandedNodes.value = nodeIds;
  }

  function setSearchTerm(term: string) {
    searchTerm.value = term;
  }

  function setShowESGOnly(show: boolean) {
    showESGOnly.value = show;
  }

  function setActiveView(view: ViewType) {
    activeView.value = view;
  }

  return {
    expandedNodes,
    searchTerm,
    showESGOnly,
    activeView,
    toggleNode,
    expandAll,
    collapseAll,
    expandToLevel,
    expandNodes,
    setExpandedNodesDirect,
    setSearchTerm,
    setShowESGOnly,
    setActiveView,
  };
}
