export type CompstatWindowId = "7d" | "28d" | "ytd" | "365d";

export interface DateRange {
  start: string;
  end: string;
  years: string[];
}

export interface DashboardFilters {
  division?: string;
  offenseCategory?: string;
}

export interface CompstatMetric {
  id: CompstatWindowId;
  label: string;
  current: number;
  previous: number;
  changePct: number;
  yearAgo: number;
  changePctYearAgo: number;
  zScore: number;
  classification: "Spike" | "Elevated" | "Normal" | "Below Normal";
}

export interface TrendPoint {
  date: string;
  count: number;
  rollingAverage: number;
  upperBand: number;
  lowerBand: number;
}

export interface IncidentFeature {
  id: string;
  offense: string;
  narrative: string;
  status: string;
  occurred: string;
  division: string;
  beat: string;
  latitude: number;
  longitude: number;
}

export interface BreakdownRow {
  label: string;
  count: number;
  changePct: number;
}

export interface CompstatResponse {
  generatedAt: string;
  filters: {
    focusRange: CompstatWindowId;
    applied: DashboardFilters;
    availableDivisions: string[];
    availableCategories: string[];
  };
  windows: CompstatMetric[];
  trend: TrendPoint[];
  topOffenses: BreakdownRow[];
  divisionLeaders: BreakdownRow[];
  incidents: IncidentFeature[];
  focusNarrative: string;
  meta?: {
    stale: boolean;
    reason?: string;
  };
}
