# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev      # Start Vite dev server
npm run build    # Type-check with vue-tsc, then build with Vite
npm run preview  # Preview production build locally
```

No test framework is currently configured.

## Architecture Overview

This is a Vue 3 + TypeScript KPI Tree visualization dashboard for open cut coal mining contractors, featuring ESG (Environmental, Social, Governance) labeling and GHG emission scope classification (Scope 1/2/3).

### Key Technologies
- Vue 3 with `<script setup>` composition API
- TypeScript with strict mode
- Vite 7 for bundling
- Tailwind CSS v4 for styling
- lucide-vue-next for icons
- JSZip for XMind file handling

### Component Structure

**Main entry:** `App.vue` → `KPITree.vue` (main dashboard)

**Core components:**
- `KPITree.vue` - Main container with header, controls, view switcher, search, and tree rendering
- `TreeNode.vue` - Recursive tree node component with drag-and-drop, expand/collapse, and ESG badges
- `ContextMenu.vue`, `AddNodeModal.vue`, `EditNodeModal.vue` - Node editing UI

### State Management (Composables)

State is managed via Vue composables in `src/composables/`:

- **`useTreeStore.ts`** - Central store for tree data, CRUD operations, drag-and-drop validation, context menu state, and modal states. Uses global reactive refs (not per-component instances).
- **`useTreeState.ts`** - UI state: expanded nodes, search term, ESG filter toggle, active view. Exports utility functions `collectAllIds()` and `findMatchingNodesAndAncestors()`.
- **`useKeyboardShortcuts.ts`** - Arrow key navigation, Space to toggle, Tab to add child, Enter/Shift+Enter for siblings, F2 to edit, Delete to remove
- **`useTheme.ts`** - Dark/light mode toggle with system preference detection

### Data Layer

KPI tree data is stored as JSON in `src/data/`:
- `financialKpiData.json`, `operationalKpiData.json` - Financial and operational KPI trees
- `bumaKpiData.json` - BUMA-specific KPI tree (604 nodes)
- `consolidatedKpiData.json` - Consolidated EBITDA view (~740 nodes)

TypeScript wrapper modules (`kpiData.ts`, `bumaKpiData.ts`, `consolidatedKpiData.ts`) import the JSON and export typed arrays with helper functions (`countNodes()`, `countESG()`, `countScope()`).

### Type System

Core types in `src/types/index.ts`:
- `KPINode` - Tree node with id, name, optional icon/unit/esg/scope/category/children
- `ESGCategory` - 'E' | 'S' | 'G'
- `EmissionScope` - 1 | 2 | 3
- `ViewType` - 'financial' | 'operational' | 'buma' | 'consolidated'
- `NodeCategory` - Hierarchy validation categories (root, revenue, cost, fcf, capex, etc.)

### Node Move Validation

`useTreeStore.ts` enforces hierarchy rules via `VALID_PARENT_CATEGORIES` mapping. The `inferCategory()` function determines node category from ID/name patterns for drag-and-drop validation.

### Views

Four switchable tree views: Financial, Operational, BUMA, and Consolidated. View switching triggers `store.initStore()` with the appropriate dataset.

### Import/Export

`src/utils/fileExport.ts` provides import/export functionality:
- **JSON**: Direct serialization of `KPINode[]` arrays
- **XMind**: Supports XMind Zen format (.xmind files are ZIP archives containing `content.json`). Export creates valid XMind files openable in XMind app. Import parses XMind topic hierarchy into KPINode tree.
