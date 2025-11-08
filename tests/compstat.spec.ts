import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DateTime } from 'luxon';
import { buildCompstatResponse, resetCompstatCache } from '@/lib/compstat';
import type { BreakdownRow, IncidentFeature } from '@/lib/types';

const socrataMocks = vi.hoisted(() => {
  const offenses: BreakdownRow[] = [
    { label: 'THEFT', count: 120, changePct: 0 },
    { label: 'BURGLARY', count: 60, changePct: 0 },
  ];
  const divisions: BreakdownRow[] = [
    { label: 'SOUTHWEST', count: 90, changePct: 0 },
    { label: 'NORTHEAST', count: 70, changePct: 0 },
  ];

  return {
    fetchCountForRange: vi.fn(async () => 100),
    fetchOffenseDetails: vi.fn(async () => [
      {
        label: 'ASSAULT OFFENSES',
        code: '13A',
        crimeAgainst: 'Person',
        count: 24,
      },
      {
        label: 'LARCENY/ THEFT OFFENSES',
        code: '23',
        crimeAgainst: 'Property',
        count: 42,
      },
    ]),
    fetchTopOffenses: vi.fn(
      async (
        _range: unknown,
        _filters: unknown,
        limit: number = offenses.length,
        onlyLabels?: string[],
      ): Promise<BreakdownRow[]> => {
        if (onlyLabels?.length) {
          return onlyLabels.map((label) => ({
            label,
            count: label === 'THEFT' ? 100 : 80,
            changePct: 0,
          }));
        }
        return offenses.slice(0, limit);
      },
    ),
    fetchDivisions: vi.fn(
      async (
        _range: unknown,
        _filters: unknown,
        limit: number = divisions.length,
        onlyLabels?: string[],
      ): Promise<BreakdownRow[]> => {
        if (onlyLabels?.length) {
          return onlyLabels.map((label) => ({
            label,
            count: label === 'SOUTHWEST' ? 84 : 65,
            changePct: 0,
          }));
        }
        return divisions.slice(0, limit);
      },
    ),
    fetchDistinctValues: vi.fn(async (field: string) =>
      field === 'division'
        ? ['SOUTHWEST', 'NORTHEAST']
        : ['THEFT', 'BURGLARY'],
    ),
    fetchDailyTrend: vi.fn(async () => [
      { day: '2024-09-01', count: 320 },
      { day: '2024-09-02', count: 300 },
      { day: '2024-09-03', count: 310 },
    ]),
    fetchIncidents: vi.fn(async () => [
      {
        id: 'INC-1',
        offense: 'BURGLARY',
        narrative: 'MOCK INCIDENT',
        status: 'Open',
        occurred: '2024-09-02 01:00:00.0000000',
        division: 'SOUTHWEST',
        beat: '123',
        latitude: 32.7,
        longitude: -96.8,
      } satisfies IncidentFeature,
    ]),
    fetchDayOfWeekCounts: vi.fn(async () => [
      { label: 'Sun', order: 0, count: 40 },
      { label: 'Mon', order: 1, count: 50 },
    ]),
    fetchHourOfDayCounts: vi.fn(async () => [
      { label: '00:00', order: 0, count: 10 },
      { label: '01:00', order: 1, count: 8 },
    ]),
  };
});

vi.mock('@/lib/socrata', () => socrataMocks);

const {
  fetchCountForRange: mockFetchCountForRange,
  fetchOffenseDetails: mockFetchOffenseDetails,
  fetchTopOffenses: mockFetchTopOffenses,
  fetchDivisions: mockFetchDivisions,
  fetchDistinctValues: mockFetchDistinctValues,
  fetchDailyTrend: mockFetchDailyTrend,
  fetchIncidents: mockFetchIncidents,
  fetchDayOfWeekCounts: mockFetchDayOfWeekCounts,
  fetchHourOfDayCounts: mockFetchHourOfDayCounts,
} = socrataMocks;

const clearAllMocks = () => {
  mockFetchCountForRange.mockClear();
  mockFetchOffenseDetails.mockClear();
  mockFetchTopOffenses.mockClear();
  mockFetchDivisions.mockClear();
  mockFetchDistinctValues.mockClear();
  mockFetchDailyTrend.mockClear();
  mockFetchIncidents.mockClear();
  mockFetchDayOfWeekCounts.mockClear();
  mockFetchHourOfDayCounts.mockClear();
};

describe('buildCompstatResponse', () => {
  const referenceNow = DateTime.fromISO('2024-09-30T12:00:00', {
    zone: 'America/Chicago',
  });

  beforeEach(() => {
    clearAllMocks();
    resetCompstatCache();
    vi.spyOn(DateTime, 'now').mockReturnValue(referenceNow);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetCompstatCache();
  });

  it('computes offense deltas using matching prior labels', async () => {
    const result = await buildCompstatResponse({}, '28d');

    const theftRow = result.topOffenses.find((row) => row.label === 'THEFT');
    expect(theftRow?.changePct).toBeCloseTo(20, 1);

    expect(mockFetchTopOffenses).toHaveBeenCalledTimes(2);
    const previousArgs = mockFetchTopOffenses.mock.calls[1];
    expect(previousArgs[3]).toEqual(['THEFT', 'BURGLARY']);
  });

  it('serves cached payloads without extra Socrata calls', async () => {
    await buildCompstatResponse({}, '28d');
    mockFetchDailyTrend.mockClear();

    const second = await buildCompstatResponse({}, '28d');
    expect(second.topOffenses.length).toBeGreaterThan(0);
    expect(mockFetchDailyTrend).not.toHaveBeenCalled();
  });

  it('includes a Last 7 Days offense drilldown table', async () => {
    const result = await buildCompstatResponse({}, '28d');
    const drilldown = result.drilldown?.['7d'];
    expect(drilldown).toBeDefined();
    expect(drilldown?.[0].crimeAgainst).toBe('Person');
    expect(mockFetchOffenseDetails).toHaveBeenCalledTimes(3);
  });
});

