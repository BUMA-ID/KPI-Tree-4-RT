import type { Component } from 'vue';

export type ESGCategory = 'E' | 'S' | 'G';
export type EmissionScope = 1 | 2 | 3;
export type PresetViewType = 'financial' | 'operational' | 'buma' | 'consolidated';
export type ViewType = PresetViewType | string; // string for custom tab IDs

export interface TabState {
  id: string;
  name: string;
  isPreset: boolean;
  presetType?: PresetViewType;
  data: KPINode[];
  expandedNodes: Set<string>;
  searchTerm: string;
  showESGOnly: boolean;
}

// Node categories for hierarchy validation
export type NodeCategory =
  | 'root'           // Top level (EBITDA)
  | 'revenue'        // Production/Revenue branch
  | 'cost'           // Cash Cost branch
  | 'fcf'            // Free Cash Flow branch
  | 'capex'          // Capital Expenditure branch
  | 'financial'      // Financial Performance branch
  | 'operational'    // Operational Excellence branch
  | 'maintenance'    // Maintenance branch
  | 'esg'            // ESG Summary branch
  | 'production'     // Production sub-items (OB, Coal, D&B)
  | 'employee'       // Employee/HR costs
  | 'equipment'      // Equipment-related (tyre, fuel, R&M)
  | 'metric';        // Leaf node metrics (flexible)

// Relationship/link between nodes
export interface NodeRelationship {
  id: string;
  targetId: string;        // ID of the linked node
  label?: string;          // Optional relationship label (e.g., "Related", "Depends on")
}

export interface KPINode {
  id: string;
  name: string;
  icon?: Component;
  unit?: string;
  esg?: ESGCategory;
  scope?: EmissionScope;
  category?: NodeCategory;
  children?: KPINode[];
  // Extended properties for XMind compatibility
  isDetached?: boolean;         // True if this is a floating/detached topic
  relationships?: NodeRelationship[];  // Links to other nodes
  markers?: string[];           // XMind markers (task-done, task-oct, etc.)
  position?: { x: number; y: number }; // Position for detached nodes
}

// Tree data with relationships stored separately for easier lookup
export interface KPITreeData {
  nodes: KPINode[];
  // Global relationships map for quick lookup: nodeId -> array of related nodeIds
  relationshipMap?: Map<string, NodeRelationship[]>;
}

export interface NewNodeData {
  name: string;
  unit?: string;
  esg?: ESGCategory;
  scope?: EmissionScope;
}
