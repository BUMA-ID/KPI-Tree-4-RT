import type { KPINode } from '../types';

// Import JSON data
import consolidatedKpiJson from './consolidatedKpiData.json';

// Export the KPI data array
export const consolidatedKPIs: KPINode[] = consolidatedKpiJson as KPINode[];
