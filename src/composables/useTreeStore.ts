import { ref, reactive } from 'vue';
import type { KPINode, NodeCategory, NewNodeData } from '../types';

const TREE_STORAGE_KEY = 'kpi-tree-modifications';

// Valid parent categories for each node category
const VALID_PARENT_CATEGORIES: Record<NodeCategory, NodeCategory[]> = {
  root: [],
  revenue: ['root'],
  cost: ['root'],
  fcf: ['root'],
  capex: ['root'],
  financial: ['root'],
  operational: ['root'],
  maintenance: ['root', 'operational'],
  esg: ['root'],
  production: ['revenue'],
  employee: ['cost'],
  equipment: ['cost', 'production', 'maintenance'],
  metric: ['revenue', 'cost', 'fcf', 'capex', 'financial', 'operational', 'maintenance', 'esg', 'production', 'employee', 'equipment', 'metric'],
};

// Infer category from node ID patterns
function inferCategory(node: KPINode): NodeCategory {
  if (node.category) return node.category;
  const id = node.id.toLowerCase();
  const name = node.name.toLowerCase();

  if (id === 'ebitda-root' || id.includes('ebitda')) return 'root';
  if (id.startsWith('production-') || id === 'production-revenue' || name.includes('production (revenue)')) return 'revenue';
  if (id === 'cash-cost' || id.startsWith('cash-cost')) return 'cost';
  if (id === 'free-cash-flow' || id.startsWith('fcf') || id.includes('free-cash')) return 'fcf';
  if (id === 'capex' || id.startsWith('capex-')) return 'capex';
  if (id.startsWith('financial-') || id === 'financial-performance') return 'financial';
  if (id.startsWith('operational-') || id === 'operational-excellence') return 'operational';
  if (id === 'maintenance' || id.startsWith('maintenance-') || id.startsWith('rm-') || id.startsWith('reliability-')) return 'maintenance';
  if (id.includes('esg') || id.startsWith('environmental-') || id.startsWith('social-') || id.startsWith('governance-')) return 'esg';
  if (id.startsWith('ob-') || id.startsWith('coal-') || id.startsWith('drill-blast')) return 'production';
  if (id.startsWith('emp-') || id.startsWith('employee-') || name.includes('employee') || name.includes('labor')) return 'employee';
  if (id.startsWith('tyre-') || id.startsWith('fuel-') || id.startsWith('equipment-') ||
      name.includes('tyre') || name.includes('fuel') || name.includes('equipment')) return 'equipment';

  return 'metric';
}

// Global reactive state
const treeData = ref<KPINode[]>([]);
const originalData = ref<KPINode[]>([]);
const isLocked = ref(true);
const moveError = ref<string | null>(null);
const hasUnsavedChanges = ref(false);
const selectedNodeId = ref<string | null>(null);

// Context menu state
const contextMenu = reactive({ x: 0, y: 0, nodeId: '', nodeName: '' });

// Modal states
const modals = reactive({
  moveModal: { open: false, nodeId: null as string | null, nodeName: '' },
  addNodeModal: { open: false, parentId: null as string | null, parentName: '' },
  editNodeModal: { open: false, nodeId: null as string | null, nodeData: null as KPINode | null },
});

// Drag state
const draggedNodeId = ref<string | null>(null);
const dropTargetId = ref<string | null>(null);

// Link mode state
const linkingMode = ref(false);
const linkSourceId = ref<string | null>(null);
const linkSourceName = ref<string>('');

// Hidden relationships (for toggling arrow visibility)
const hiddenRelationships = ref<Set<string>>(new Set());

// View key for storage
let viewKey = 'default';

export function useTreeStore() {
  // Initialize the store with data
  function initStore(initialData: KPINode[], key: string = 'default') {
    treeData.value = JSON.parse(JSON.stringify(initialData));
    originalData.value = JSON.parse(JSON.stringify(initialData));
    viewKey = key;
    hasUnsavedChanges.value = false;
  }

  // Set tree data
  function setTreeData(data: KPINode[]) {
    treeData.value = data;
    hasUnsavedChanges.value = true;
  }

  // Toggle lock
  function toggleLock() {
    isLocked.value = !isLocked.value;
  }

  // Deep clone helper
  function deepClone(nodes: KPINode[]): KPINode[] {
    return JSON.parse(JSON.stringify(nodes));
  }

  // Find node by ID
  function findNodeById(id: string, nodes: KPINode[] = treeData.value): KPINode | null {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findNodeById(id, node.children);
        if (found) return found;
      }
    }
    return null;
  }

  // Find parent of a node
  function findParentOfNode(nodeId: string, nodes: KPINode[] = treeData.value, parent: KPINode | null = null): KPINode | null {
    for (const node of nodes) {
      if (node.id === nodeId) return parent;
      if (node.children) {
        const found = findParentOfNode(nodeId, node.children, node);
        if (found !== undefined) return found;
      }
    }
    return null;
  }

  // Get all nodes with paths
  function getAllNodes(): { id: string; name: string; path: string; hasChildren: boolean; category: NodeCategory }[] {
    const result: { id: string; name: string; path: string; hasChildren: boolean; category: NodeCategory }[] = [];

    const traverse = (nodes: KPINode[], path: string[] = []) => {
      for (const node of nodes) {
        const currentPath = [...path, node.name];
        result.push({
          id: node.id,
          name: node.name,
          path: currentPath.join(' > '),
          hasChildren: !!(node.children && node.children.length > 0),
          category: inferCategory(node),
        });
        if (node.children) {
          traverse(node.children, currentPath);
        }
      }
    };

    result.push({ id: '__root__', name: 'Root Level', path: 'Root Level', hasChildren: true, category: 'root' });
    traverse(treeData.value);
    return result;
  }

  // Generate unique ID
  function generateNodeId(): string {
    return `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Save modifications
  function saveModifications() {
    try {
      localStorage.setItem(`${TREE_STORAGE_KEY}-${viewKey}`, JSON.stringify({
        timestamp: Date.now(),
      }));
    } catch {
      // Ignore errors
    }
  }

  // Check if move is valid
  function isMoveValid(sourceNode: KPINode, targetNode: KPINode | null): { valid: boolean; reason?: string } {
    const sourceCategory = inferCategory(sourceNode);
    const targetCategory = targetNode ? inferCategory(targetNode) : 'root';

    if (sourceCategory === 'root') {
      return { valid: false, reason: 'Cannot move root-level EBITDA node' };
    }

    if (!targetNode) {
      const allowedAtRoot = VALID_PARENT_CATEGORIES[sourceCategory].includes('root');
      if (!allowedAtRoot) {
        return { valid: false, reason: `${sourceNode.name} cannot be moved to root level` };
      }
      return { valid: true };
    }

    const validParents = VALID_PARENT_CATEGORIES[sourceCategory];
    if (!validParents.includes(targetCategory)) {
      return {
        valid: false,
        reason: `${sourceCategory} items cannot be moved under ${targetCategory} items.`
      };
    }

    return { valid: true };
  }

  // Check if target is descendant of node
  function isDescendant(nodeId: string, targetId: string): boolean {
    const checkDescendants = (node: KPINode, target: string): boolean => {
      if (node.id === target) return true;
      if (node.children) {
        return node.children.some(child => checkDescendants(child, target));
      }
      return false;
    };

    const sourceNode = findNodeById(nodeId);
    if (!sourceNode) return false;
    return checkDescendants(sourceNode, targetId);
  }

  // Validate move
  function validateMove(nodeId: string, targetParentId: string | null): { valid: boolean; reason?: string } {
    if (nodeId === targetParentId) {
      return { valid: false, reason: 'Cannot move a node to itself' };
    }

    const sourceNode = findNodeById(nodeId);
    if (!sourceNode) {
      return { valid: false, reason: 'Source node not found' };
    }

    if (targetParentId && targetParentId !== '__root__' && isDescendant(nodeId, targetParentId)) {
      return { valid: false, reason: 'Cannot move a node into its own descendant' };
    }

    const targetNode = targetParentId && targetParentId !== '__root__'
      ? findNodeById(targetParentId)
      : null;

    return isMoveValid(sourceNode, targetNode);
  }

  // Remove node from tree
  function removeNodeFromTree(nodeId: string, nodes: KPINode[]): { updatedNodes: KPINode[]; removedNode: KPINode | null } {
    let removedNode: KPINode | null = null;

    const filter = (items: KPINode[]): KPINode[] => {
      return items.filter(item => {
        if (item.id === nodeId) {
          removedNode = { ...item };
          return false;
        }
        if (item.children) {
          item.children = filter(item.children);
        }
        return true;
      });
    };

    const updatedNodes = filter(deepClone(nodes));
    return { updatedNodes, removedNode };
  }

  // Add node to parent
  function addNodeToParent(nodes: KPINode[], parentId: string | null, nodeToAdd: KPINode): KPINode[] {
    if (parentId === null || parentId === '__root__') {
      return [...nodes, nodeToAdd];
    }

    return nodes.map(node => {
      if (node.id === parentId) {
        return {
          ...node,
          children: [...(node.children || []), nodeToAdd],
        };
      }
      if (node.children) {
        return {
          ...node,
          children: addNodeToParent(node.children, parentId, nodeToAdd),
        };
      }
      return node;
    });
  }

  // Move node
  function moveNode(nodeId: string, targetParentId: string | null): { valid: boolean; reason?: string } {
    const validation = validateMove(nodeId, targetParentId);
    if (!validation.valid) {
      moveError.value = validation.reason || 'Invalid move';
      setTimeout(() => { moveError.value = null; }, 5000);
      return validation;
    }

    const { updatedNodes, removedNode } = removeNodeFromTree(nodeId, treeData.value);
    if (!removedNode) return { valid: false, reason: 'Node not found' };

    treeData.value = addNodeToParent(updatedNodes, targetParentId, removedNode);
    hasUnsavedChanges.value = true;
    saveModifications();

    return { valid: true };
  }

  // Add new node as child
  function addNode(parentId: string, nodeData: NewNodeData): string {
    const newNode: KPINode = {
      id: generateNodeId(),
      name: nodeData.name,
      unit: nodeData.unit,
      esg: nodeData.esg,
      scope: nodeData.scope,
      category: 'metric',
    };

    const addToParent = (nodes: KPINode[]): KPINode[] => {
      return nodes.map(node => {
        if (node.id === parentId) {
          return {
            ...node,
            children: [...(node.children || []), newNode],
          };
        }
        if (node.children) {
          return {
            ...node,
            children: addToParent(node.children),
          };
        }
        return node;
      });
    };

    treeData.value = addToParent(deepClone(treeData.value));
    hasUnsavedChanges.value = true;
    saveModifications();

    return newNode.id;
  }

  // Add sibling node
  function addSiblingNode(siblingId: string, nodeData: NewNodeData, position: 'after' | 'before' = 'after'): string | null {
    const newNode: KPINode = {
      id: generateNodeId(),
      name: nodeData.name,
      unit: nodeData.unit,
      esg: nodeData.esg,
      scope: nodeData.scope,
      category: 'metric',
    };

    let added = false;

    const addAsSibling = (nodes: KPINode[]): KPINode[] => {
      const result: KPINode[] = [];
      for (const node of nodes) {
        if (node.id === siblingId) {
          if (position === 'before') {
            result.push(newNode);
            result.push(node);
          } else {
            result.push(node);
            result.push(newNode);
          }
          added = true;
        } else {
          if (node.children) {
            result.push({
              ...node,
              children: addAsSibling(node.children),
            });
          } else {
            result.push(node);
          }
        }
      }
      return result;
    };

    treeData.value = addAsSibling(deepClone(treeData.value));
    if (added) {
      hasUnsavedChanges.value = true;
      saveModifications();
    }

    return added ? newNode.id : null;
  }

  // Edit node
  function editNode(nodeId: string, nodeData: NewNodeData) {
    const updateNode = (nodes: KPINode[]): KPINode[] => {
      return nodes.map(node => {
        if (node.id === nodeId) {
          return {
            ...node,
            name: nodeData.name,
            unit: nodeData.unit,
            esg: nodeData.esg,
            scope: nodeData.scope,
          };
        }
        if (node.children) {
          return {
            ...node,
            children: updateNode(node.children),
          };
        }
        return node;
      });
    };

    treeData.value = updateNode(deepClone(treeData.value));
    hasUnsavedChanges.value = true;
    saveModifications();
  }

  // Delete node
  function deleteNode(nodeId: string) {
    const removeNode = (nodes: KPINode[]): KPINode[] => {
      return nodes.filter(node => {
        if (node.id === nodeId) return false;
        if (node.children) {
          node.children = removeNode(node.children);
        }
        return true;
      });
    };

    treeData.value = removeNode(deepClone(treeData.value));
    hasUnsavedChanges.value = true;
    saveModifications();
    closeContextMenu();
  }

  // Duplicate node
  function duplicateNode(nodeId: string) {
    const nodeToDuplicate = findNodeById(nodeId);
    if (!nodeToDuplicate) return;

    const duplicateWithNewIds = (node: KPINode): KPINode => {
      return {
        ...node,
        id: generateNodeId(),
        name: `${node.name} (copy)`,
        children: node.children?.map(duplicateWithNewIds),
      };
    };

    const duplicatedNode = duplicateWithNewIds(nodeToDuplicate);

    const addSibling = (nodes: KPINode[]): KPINode[] => {
      const result: KPINode[] = [];
      for (const node of nodes) {
        result.push(node);
        if (node.id === nodeId) {
          result.push(duplicatedNode);
        }
        if (node.children) {
          const idx = result.length - 1;
          const currentNode = result[idx];
          if (currentNode) {
            result[idx] = {
              id: currentNode.id,
              name: currentNode.name,
              icon: currentNode.icon,
              unit: currentNode.unit,
              esg: currentNode.esg,
              scope: currentNode.scope,
              category: currentNode.category,
              children: addSibling(node.children),
            };
          }
        }
      }
      return result;
    };

    const isAtRoot = treeData.value.some(n => n.id === nodeId);
    if (isAtRoot) {
      const index = treeData.value.findIndex(n => n.id === nodeId);
      const newData = deepClone(treeData.value);
      newData.splice(index + 1, 0, duplicatedNode);
      treeData.value = newData;
    } else {
      treeData.value = addSibling(deepClone(treeData.value));
    }

    hasUnsavedChanges.value = true;
    saveModifications();
    closeContextMenu();
  }

  // Reset changes
  function resetChanges() {
    treeData.value = deepClone(originalData.value);
    hasUnsavedChanges.value = false;
    try {
      localStorage.removeItem(`${TREE_STORAGE_KEY}-${viewKey}`);
    } catch {
      // Ignore
    }
  }

  // ============================================================================
  // LINK/RELATIONSHIP MANAGEMENT
  // ============================================================================

  // Start link mode - first step of creating a link
  function startLinkMode(sourceId: string, sourceName: string) {
    linkingMode.value = true;
    linkSourceId.value = sourceId;
    linkSourceName.value = sourceName;
    closeContextMenu();
  }

  // Cancel link mode
  function cancelLinkMode() {
    linkingMode.value = false;
    linkSourceId.value = null;
    linkSourceName.value = '';
  }

  // Create a link between two nodes
  function createLink(targetId: string, label?: string): boolean {
    if (!linkSourceId.value || linkSourceId.value === targetId) {
      cancelLinkMode();
      return false;
    }

    const sourceNode = findNodeById(linkSourceId.value);
    if (!sourceNode) {
      cancelLinkMode();
      return false;
    }

    // Check if link already exists
    if (sourceNode.relationships?.some(r => r.targetId === targetId)) {
      cancelLinkMode();
      return false;
    }

    // Generate link ID
    const linkId = `link-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Add relationship to source node
    const updateNode = (nodes: KPINode[]): KPINode[] => {
      return nodes.map(node => {
        if (node.id === linkSourceId.value) {
          const relationships = node.relationships || [];
          return {
            ...node,
            relationships: [...relationships, { id: linkId, targetId, label }],
          };
        }
        if (node.children) {
          return { ...node, children: updateNode(node.children) };
        }
        return node;
      });
    };

    treeData.value = updateNode(deepClone(treeData.value));
    hasUnsavedChanges.value = true;
    saveModifications();
    cancelLinkMode();
    return true;
  }

  // Delete a link
  function deleteLink(sourceId: string, targetId: string) {
    const updateNode = (nodes: KPINode[]): KPINode[] => {
      return nodes.map(node => {
        if (node.id === sourceId && node.relationships) {
          return {
            ...node,
            relationships: node.relationships.filter(r => r.targetId !== targetId),
          };
        }
        if (node.children) {
          return { ...node, children: updateNode(node.children) };
        }
        return node;
      });
    };

    treeData.value = updateNode(deepClone(treeData.value));
    hasUnsavedChanges.value = true;
    saveModifications();
  }

  // Update link label
  function updateLinkLabel(sourceId: string, targetId: string, label: string) {
    const updateNode = (nodes: KPINode[]): KPINode[] => {
      return nodes.map(node => {
        if (node.id === sourceId && node.relationships) {
          return {
            ...node,
            relationships: node.relationships.map(r =>
              r.targetId === targetId ? { ...r, label } : r
            ),
          };
        }
        if (node.children) {
          return { ...node, children: updateNode(node.children) };
        }
        return node;
      });
    };

    treeData.value = updateNode(deepClone(treeData.value));
    hasUnsavedChanges.value = true;
    saveModifications();
  }

  // Toggle marker on a node
  function toggleMarker(nodeId: string, marker: string) {
    const updateNode = (nodes: KPINode[]): KPINode[] => {
      return nodes.map(node => {
        if (node.id === nodeId) {
          const markers = node.markers || [];
          const hasMarker = markers.includes(marker);
          return {
            ...node,
            markers: hasMarker
              ? markers.filter(m => m !== marker)
              : [...markers, marker],
          };
        }
        if (node.children) {
          return { ...node, children: updateNode(node.children) };
        }
        return node;
      });
    };

    treeData.value = updateNode(deepClone(treeData.value));
    hasUnsavedChanges.value = true;
    saveModifications();
  }

  // Toggle relationship visibility
  function toggleRelationshipVisibility(sourceId: string, targetId: string) {
    const key = `${sourceId}->${targetId}`;
    const newSet = new Set(hiddenRelationships.value);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    hiddenRelationships.value = newSet;
  }

  function isRelationshipHidden(sourceId: string, targetId: string): boolean {
    return hiddenRelationships.value.has(`${sourceId}->${targetId}`);
  }

  // Clear move error
  function clearMoveError() {
    moveError.value = null;
  }

  // Context menu functions
  function openContextMenu(x: number, y: number, nodeId: string, nodeName: string) {
    Object.assign(contextMenu, { x, y, nodeId, nodeName });
  }

  function closeContextMenu() {
    Object.assign(contextMenu, { x: 0, y: 0, nodeId: '', nodeName: '' });
  }

  // Modal functions
  function openMoveModal(nodeId: string, nodeName: string) {
    modals.moveModal = { open: true, nodeId, nodeName };
    closeContextMenu();
  }

  function closeMoveModal() {
    modals.moveModal = { open: false, nodeId: null, nodeName: '' };
  }

  function openAddNodeModal(parentId: string, parentName: string) {
    modals.addNodeModal = { open: true, parentId, parentName };
    closeContextMenu();
  }

  function closeAddNodeModal() {
    modals.addNodeModal = { open: false, parentId: null, parentName: '' };
  }

  function openEditNodeModal(nodeId: string) {
    const node = findNodeById(nodeId);
    if (node) {
      modals.editNodeModal = { open: true, nodeId, nodeData: { ...node } };
      closeContextMenu();
    }
  }

  function closeEditNodeModal() {
    modals.editNodeModal = { open: false, nodeId: null, nodeData: null };
  }

  return {
    // State
    treeData,
    isLocked,
    moveError,
    hasUnsavedChanges,
    selectedNodeId,
    contextMenu,
    modals,
    draggedNodeId,
    dropTargetId,

    // Link mode state
    linkingMode,
    linkSourceId,
    linkSourceName,
    hiddenRelationships,

    // Actions
    initStore,
    setTreeData,
    toggleLock,
    moveNode,
    validateMove,
    addNode,
    addSiblingNode,
    editNode,
    deleteNode,
    duplicateNode,
    resetChanges,
    clearMoveError,
    findNodeById,
    findParentOfNode,
    getAllNodes,

    // Link management
    startLinkMode,
    cancelLinkMode,
    createLink,
    deleteLink,
    updateLinkLabel,
    toggleMarker,
    toggleRelationshipVisibility,
    isRelationshipHidden,

    // Context menu
    openContextMenu,
    closeContextMenu,

    // Modals
    openMoveModal,
    closeMoveModal,
    openAddNodeModal,
    closeAddNodeModal,
    openEditNodeModal,
    closeEditNodeModal,
  };
}
