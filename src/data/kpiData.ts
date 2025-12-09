import type { KPINode } from '../types';

// Import JSON data
import financialKpiJson from './financialKpiData.json';
import operationalKpiJson from './operationalKpiData.json';

// Export the KPI data arrays
export const financialKPIs: KPINode[] = financialKpiJson as KPINode[];
export const operationalKPIs: KPINode[] = operationalKpiJson as KPINode[];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function collectAllIds(nodes: KPINode[]): string[] {
  const ids: string[] = [];
  nodes.forEach((node) => {
    ids.push(node.id);
    if (node.children) {
      ids.push(...collectAllIds(node.children));
    }
  });
  return ids;
}

export function countNodes(nodes: KPINode[]): number {
  let count = 0;
  nodes.forEach((node) => {
    count++;
    if (node.children) {
      count += countNodes(node.children);
    }
  });
  return count;
}

export function countESG(nodes: KPINode[], type: 'E' | 'S' | 'G'): number {
  let count = 0;
  nodes.forEach((node) => {
    if (node.esg === type) count++;
    if (node.children) count += countESG(node.children, type);
  });
  return count;
}

export function countScope(nodes: KPINode[], scope: 1 | 2 | 3): number {
  let count = 0;
  nodes.forEach((node) => {
    if (node.scope === scope) count++;
    if (node.children) count += countScope(node.children, scope);
  });
  return count;
}

export function hasESGContent(node: KPINode): boolean {
  if (node.esg || node.scope) return true;
  if (node.children) return node.children.some(hasESGContent);
  return false;
}

// Find all nodes matching a search term and their ancestor IDs (for filter-based search)
export function findMatchingNodesAndAncestors(
  nodes: KPINode[],
  searchTerm: string,
  parentIds: string[] = []
): { matchingIds: Set<string>; ancestorIds: Set<string>; expandIds: Set<string> } {
  const matchingIds = new Set<string>();
  const ancestorIds = new Set<string>();
  const expandIds = new Set<string>();
  const term = searchTerm.toLowerCase();

  const search = (nodeList: KPINode[], ancestors: string[]) => {
    for (const node of nodeList) {
      const isMatch = node.name.toLowerCase().includes(term);

      if (isMatch) {
        matchingIds.add(node.id);
        // Add all ancestors to both sets
        ancestors.forEach(id => {
          ancestorIds.add(id);
          expandIds.add(id);
        });
      }

      if (node.children && node.children.length > 0) {
        // Recursively search children
        search(node.children, [...ancestors, node.id]);
      }
    }
  };

  search(nodes, parentIds);
  return { matchingIds, ancestorIds, expandIds };
}

// Check if a node or any of its descendants match the search term
export function hasMatchingDescendant(node: KPINode, searchTerm: string): boolean {
  const term = searchTerm.toLowerCase();
  if (node.name.toLowerCase().includes(term)) return true;
  if (node.children) {
    return node.children.some(child => hasMatchingDescendant(child, term));
  }
  return false;
}
