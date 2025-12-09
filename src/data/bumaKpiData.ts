import type { KPINode } from '../types';

// Import JSON data
import bumaKpiJson from './bumaKpiData.json';

// Export the KPI data array
export const bumaKPIs: KPINode[] = bumaKpiJson as KPINode[];
