import { onMounted, onUnmounted, type Ref } from 'vue';
import { useTreeStore } from './useTreeStore';
import type { KPINode } from '../types';

interface UseKeyboardShortcutsOptions {
  enabled: boolean;
  expandedNodes: Ref<Set<string>>;
  treeData: Ref<KPINode[]>;
  onToggle: (nodeId: string) => void;
}

export function useKeyboardShortcuts({
  enabled,
  expandedNodes,
  treeData,
  onToggle,
}: UseKeyboardShortcutsOptions) {
  const store = useTreeStore();

  // Get all visible node IDs in tree order
  function getVisibleNodeIds(): string[] {
    const ids: string[] = [];

    const traverse = (nodes: KPINode[]) => {
      for (const node of nodes) {
        ids.push(node.id);
        if (node.children && expandedNodes.value.has(node.id)) {
          traverse(node.children);
        }
      }
    };

    traverse(treeData.value);
    return ids;
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (!enabled) return;

    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    const selectedNodeId = store.selectedNodeId.value;

    // If no node is selected, select the first one on arrow key press
    if (!selectedNodeId) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        const visibleIds = getVisibleNodeIds();
        if (visibleIds.length > 0) {
          store.selectedNodeId.value = visibleIds[0] ?? null;
          event.preventDefault();
        }
      }
      return;
    }

    const selectedNode = store.findNodeById(selectedNodeId);
    if (!selectedNode) return;

    switch (event.key) {
      case 'ArrowDown': {
        event.preventDefault();
        const visibleIds = getVisibleNodeIds();
        const currentIndex = visibleIds.indexOf(selectedNodeId);
        if (currentIndex < visibleIds.length - 1) {
          store.selectedNodeId.value = visibleIds[currentIndex + 1] ?? null;
        }
        break;
      }

      case 'ArrowUp': {
        event.preventDefault();
        const visibleIds = getVisibleNodeIds();
        const currentIndex = visibleIds.indexOf(selectedNodeId);
        if (currentIndex > 0) {
          store.selectedNodeId.value = visibleIds[currentIndex - 1] ?? null;
        }
        break;
      }

      case 'ArrowRight': {
        event.preventDefault();
        if (selectedNode.children && selectedNode.children.length > 0) {
          if (!expandedNodes.value.has(selectedNodeId)) {
            onToggle(selectedNodeId);
          } else {
            const firstChild = selectedNode.children[0];
            if (firstChild) {
              store.selectedNodeId.value = firstChild.id;
            }
          }
        }
        break;
      }

      case 'ArrowLeft': {
        event.preventDefault();
        if (expandedNodes.value.has(selectedNodeId)) {
          onToggle(selectedNodeId);
        } else {
          const parent = store.findParentOfNode(selectedNodeId);
          if (parent) {
            store.selectedNodeId.value = parent.id;
          }
        }
        break;
      }

      case 'Enter': {
        if (store.isLocked.value) return;
        event.preventDefault();

        if (event.shiftKey) {
          const newId = store.addSiblingNode(selectedNodeId, { name: 'New Node' }, 'before');
          if (newId) {
            store.selectedNodeId.value = newId;
            setTimeout(() => store.openEditNodeModal(newId), 50);
          }
        } else if (!event.ctrlKey && !event.metaKey) {
          const newId = store.addSiblingNode(selectedNodeId, { name: 'New Node' }, 'after');
          if (newId) {
            store.selectedNodeId.value = newId;
            setTimeout(() => store.openEditNodeModal(newId), 50);
          }
        }
        break;
      }

      case 'Tab': {
        if (store.isLocked.value) return;
        event.preventDefault();

        const newId = store.addNode(selectedNodeId, { name: 'New Node' });
        if (newId) {
          if (!expandedNodes.value.has(selectedNodeId)) {
            onToggle(selectedNodeId);
          }
          store.selectedNodeId.value = newId;
          setTimeout(() => store.openEditNodeModal(newId), 50);
        }
        break;
      }

      case 'F2': {
        if (store.isLocked.value) return;
        event.preventDefault();
        store.openEditNodeModal(selectedNodeId);
        break;
      }

      case 'Delete':
      case 'Backspace': {
        if (store.isLocked.value) return;
        if (event.key === 'Backspace' && !event.metaKey) return;

        event.preventDefault();

        const visibleIds = getVisibleNodeIds();
        const currentIndex = visibleIds.indexOf(selectedNodeId);
        let nextNodeId: string | null = null;

        if (currentIndex < visibleIds.length - 1) {
          nextNodeId = visibleIds[currentIndex + 1] ?? null;
        } else if (currentIndex > 0) {
          nextNodeId = visibleIds[currentIndex - 1] ?? null;
        }

        store.deleteNode(selectedNodeId);
        store.selectedNodeId.value = nextNodeId;
        break;
      }

      case 'Escape': {
        event.preventDefault();
        store.selectedNodeId.value = null;
        break;
      }

      case ' ': {
        event.preventDefault();
        if (selectedNode.children && selectedNode.children.length > 0) {
          onToggle(selectedNodeId);
        }
        break;
      }
    }
  }

  onMounted(() => {
    if (enabled) {
      window.addEventListener('keydown', handleKeyDown);
    }
  });

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown);
  });
}
