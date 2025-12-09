import type { KPINode, NodeRelationship } from '../types';
import JSZip from 'jszip';

// ============================================================================
// JSON EXPORT/IMPORT
// ============================================================================

export function exportToJson(data: KPINode[], filename: string = 'kpi-tree.json'): void {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  downloadBlob(blob, filename);
}

export function importFromJson(file: File): Promise<KPINode[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        if (Array.isArray(data)) {
          resolve(data as KPINode[]);
        } else {
          reject(new Error('Invalid JSON format: expected an array of KPI nodes'));
        }
      } catch (err) {
        reject(new Error('Failed to parse JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

// ============================================================================
// XMIND TYPES
// ============================================================================

interface XMindTopic {
  id: string;
  class?: string;
  title: string;
  attributedTitle?: { text: string }[];
  position?: { x: number; y: number };
  structureClass?: string;
  markers?: { markerId: string }[];
  children?: {
    attached?: XMindTopic[];
    detached?: XMindTopic[];
  };
  summary?: XMindTopic[];
}

interface XMindRelationship {
  id: string;
  end1Id: string;
  end2Id: string;
  title?: string;
  attributedTitle?: { text: string }[];
}

interface XMindSheet {
  id: string;
  class?: string;
  title: string;
  rootTopic: XMindTopic;
  relationships?: XMindRelationship[];
}

// ============================================================================
// XMIND EXPORT
// ============================================================================

function generateXMindId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function kpiNodeToXMindTopic(node: KPINode): XMindTopic {
  const title = node.name + (node.unit ? ` (${node.unit})` : '');

  const topic: XMindTopic = {
    id: node.id,
    class: node.isDetached ? 'importantTopic' : 'topic',
    title,
    attributedTitle: [{ text: title }],
  };

  // Add position for detached nodes
  if (node.position) {
    topic.position = node.position;
  }

  // Add markers
  if (node.markers && node.markers.length > 0) {
    topic.markers = node.markers.map(m => ({ markerId: m }));
  }

  // Add children
  const attachedChildren = node.children?.filter(c => !c.isDetached) || [];
  const detachedChildren = node.children?.filter(c => c.isDetached) || [];

  if (attachedChildren.length > 0 || detachedChildren.length > 0) {
    topic.children = {};
    if (attachedChildren.length > 0) {
      topic.children.attached = attachedChildren.map(child => kpiNodeToXMindTopic(child));
    }
    if (detachedChildren.length > 0) {
      topic.children.detached = detachedChildren.map(child => kpiNodeToXMindTopic(child));
    }
  }

  return topic;
}

// Collect all relationships from the tree
function collectRelationships(nodes: KPINode[]): XMindRelationship[] {
  const relationships: XMindRelationship[] = [];

  function traverse(node: KPINode) {
    if (node.relationships) {
      for (const rel of node.relationships) {
        relationships.push({
          id: rel.id,
          end1Id: node.id,
          end2Id: rel.targetId,
          title: rel.label,
          attributedTitle: rel.label ? [{ text: rel.label }] : undefined,
        });
      }
    }
    if (node.children) {
      node.children.forEach(traverse);
    }
  }

  nodes.forEach(traverse);
  return relationships;
}

export async function exportToXMind(data: KPINode[], filename: string = 'kpi-tree.xmind'): Promise<void> {
  const zip = new JSZip();

  // Separate root nodes and detached nodes
  const rootNodes = data.filter(n => !n.isDetached);
  const detachedNodes = data.filter(n => n.isDetached);

  // Create sheets - one per root node, with detached nodes added to first sheet
  const sheets: XMindSheet[] = rootNodes.map((rootNode, index) => {
    const sheet: XMindSheet = {
      id: generateXMindId(),
      class: 'sheet',
      title: `Sheet ${index + 1}`,
      rootTopic: kpiNodeToXMindTopic(rootNode),
    };

    // Add detached nodes to first sheet only
    if (index === 0 && detachedNodes.length > 0) {
      if (!sheet.rootTopic.children) {
        sheet.rootTopic.children = {};
      }
      sheet.rootTopic.children.detached = detachedNodes.map(n => kpiNodeToXMindTopic(n));
    }

    // Add relationships
    const relationships = collectRelationships(index === 0 ? data : [rootNode]);
    if (relationships.length > 0) {
      sheet.relationships = relationships;
    }

    return sheet;
  });

  // If no root nodes but have detached nodes, create a sheet for them
  if (rootNodes.length === 0 && detachedNodes.length > 0) {
    const sheet: XMindSheet = {
      id: generateXMindId(),
      class: 'sheet',
      title: 'Sheet 1',
      rootTopic: {
        id: generateXMindId(),
        class: 'topic',
        title: 'Root',
        attributedTitle: [{ text: 'Root' }],
        children: {
          detached: detachedNodes.map(n => kpiNodeToXMindTopic(n)),
        },
      },
    };
    sheets.push(sheet);
  }

  const contentJson = JSON.stringify(sheets);
  zip.file('content.json', contentJson);

  // Create metadata.json
  const metadata = {
    creator: {
      name: 'KPI Tree Dashboard',
      version: '1.0.0',
    },
  };
  zip.file('metadata.json', JSON.stringify(metadata));

  // Create manifest.json
  const manifest = {
    'file-entries': {
      'content.json': {},
      'metadata.json': {},
    },
  };
  zip.file('manifest.json', JSON.stringify(manifest));

  // Generate the zip file
  const blob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(blob, filename);
}

// ============================================================================
// XMIND IMPORT
// ============================================================================

// Build a map of all node IDs for relationship resolution
function buildNodeIdMap(nodes: KPINode[]): Map<string, KPINode> {
  const map = new Map<string, KPINode>();

  function traverse(node: KPINode) {
    map.set(node.id, node);
    if (node.children) {
      node.children.forEach(traverse);
    }
  }

  nodes.forEach(traverse);
  return map;
}

function xmindTopicToKPINode(
  topic: XMindTopic,
  isDetached: boolean = false
): KPINode {
  // Get title from attributedTitle or title
  let title = topic.title || 'Untitled';
  if (topic.attributedTitle && topic.attributedTitle.length > 0) {
    title = topic.attributedTitle.map(t => t.text).join('');
  }

  // Parse unit from title if present (e.g., "Revenue ($)" -> name: "Revenue", unit: "$")
  let name = title;
  let unit: string | undefined;
  const unitMatch = title.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (unitMatch && unitMatch[1] && unitMatch[2]) {
    name = unitMatch[1].trim();
    unit = unitMatch[2].trim();
  }

  const node: KPINode = {
    id: topic.id,
    name,
    unit,
    isDetached,
  };

  // Add position for detached nodes
  if (topic.position) {
    node.position = topic.position;
  }

  // Add markers
  if (topic.markers && topic.markers.length > 0) {
    node.markers = topic.markers.map(m => m.markerId);
  }

  // Process attached children
  const children: KPINode[] = [];

  if (topic.children?.attached) {
    for (const child of topic.children.attached) {
      children.push(xmindTopicToKPINode(child, false));
    }
  }

  // Process summary topics as children too
  if (topic.summary) {
    for (const summaryTopic of topic.summary) {
      const summaryNode = xmindTopicToKPINode(summaryTopic, false);
      // Mark summary nodes with a special marker
      summaryNode.markers = [...(summaryNode.markers || []), 'summary'];
      children.push(summaryNode);
    }
  }

  if (children.length > 0) {
    node.children = children;
  }

  return node;
}

// Process relationships and add them to nodes
function processRelationships(
  nodes: KPINode[],
  relationships: XMindRelationship[]
): void {
  const nodeMap = buildNodeIdMap(nodes);

  for (const rel of relationships) {
    const sourceNode = nodeMap.get(rel.end1Id);
    const targetNode = nodeMap.get(rel.end2Id);

    if (sourceNode && targetNode) {
      // Add relationship to source node
      if (!sourceNode.relationships) {
        sourceNode.relationships = [];
      }

      // Get label from title or attributedTitle
      let label = rel.title;
      if (rel.attributedTitle && rel.attributedTitle.length > 0) {
        label = rel.attributedTitle.map(t => t.text).join('');
      }

      const nodeRel: NodeRelationship = {
        id: rel.id,
        targetId: rel.end2Id,
        label,
      };

      sourceNode.relationships.push(nodeRel);

      // Also add reverse relationship for bidirectional access
      if (!targetNode.relationships) {
        targetNode.relationships = [];
      }

      // Check if reverse already exists
      const hasReverse = targetNode.relationships.some(r => r.targetId === rel.end1Id);
      if (!hasReverse) {
        targetNode.relationships.push({
          id: `${rel.id}-reverse`,
          targetId: rel.end1Id,
          label: label ? `← ${label}` : undefined,
        });
      }
    }
  }
}

export async function importFromXMind(file: File): Promise<KPINode[]> {
  const zip = new JSZip();
  const contents = await zip.loadAsync(file);

  // Try to find content.json (XMind Zen format)
  const contentFile = contents.file('content.json');
  if (contentFile) {
    const contentStr = await contentFile.async('string');
    const sheets = JSON.parse(contentStr) as XMindSheet[];

    const allNodes: KPINode[] = [];
    const allRelationships: XMindRelationship[] = [];

    for (const sheet of sheets) {
      // Process root topic
      if (sheet.rootTopic) {
        const rootNode = xmindTopicToKPINode(sheet.rootTopic, false);
        allNodes.push(rootNode);

        // Process detached children of root as separate top-level detached nodes
        if (sheet.rootTopic.children?.detached) {
          for (const detached of sheet.rootTopic.children.detached) {
            const detachedNode = xmindTopicToKPINode(detached, true);
            allNodes.push(detachedNode);
          }
        }
      }

      // Collect relationships
      if (sheet.relationships) {
        allRelationships.push(...sheet.relationships);
      }
    }

    // Process relationships and add them to nodes
    if (allRelationships.length > 0) {
      processRelationships(allNodes, allRelationships);
    }

    return allNodes;
  }

  // Try legacy XML format - content.xml
  const xmlFile = contents.file('content.xml');
  if (xmlFile) {
    throw new Error('Legacy XMind XML format is not supported. Please use XMind Zen (.xmind) files.');
  }

  throw new Error('Invalid XMind file: could not find content.json or content.xml');
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function triggerFileInput(accept: string, onFile: (file: File) => void): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = accept;
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      onFile(file);
    }
  };
  input.click();
}

// Helper to find a node by ID in a tree
export function findNodeById(nodes: KPINode[], id: string): KPINode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

// Helper to get all relationships for display
export function getAllRelationships(nodes: KPINode[]): { source: KPINode; target: KPINode; label?: string }[] {
  const results: { source: KPINode; target: KPINode; label?: string }[] = [];
  const nodeMap = buildNodeIdMap(nodes);
  const seen = new Set<string>();

  function traverse(node: KPINode) {
    if (node.relationships) {
      for (const rel of node.relationships) {
        // Only add non-reverse relationships to avoid duplicates
        if (!rel.id.endsWith('-reverse')) {
          const key = `${node.id}-${rel.targetId}`;
          if (!seen.has(key)) {
            seen.add(key);
            const target = nodeMap.get(rel.targetId);
            if (target) {
              results.push({
                source: node,
                target,
                label: rel.label,
              });
            }
          }
        }
      }
    }
    if (node.children) {
      node.children.forEach(traverse);
    }
  }

  nodes.forEach(traverse);
  return results;
}
