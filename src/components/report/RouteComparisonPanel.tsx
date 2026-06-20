import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWaybillStore } from '@/store/useWaybillStore';
import {
  TrendingUp,
  Clock,
  User,
  AlertTriangle,
  BarChart4,
  ArrowUpDown,
  MapPin,
  Play,
  Filter,
} from 'lucide-react';
import type { Waybill } from '@/types';
import dayjs from 'dayjs';

type SortField =
  | 'driftCount'
  | 'avgDriftMin'
  | 'maxStopMin'
  | 'waybillCount';

interface RouteComparisonRow {
  route: string;
  waybillCount: number;
  driftCount: number;
  avgDriftMin: number;
  maxStopMin: number;
  riskDrivers: { name: string; minutes: number }[];
  worstDriftWaybill: Waybill | null;
}

export default function RouteComparisonPanel() {
  const navigate = useNavigate();
  const waybills = useWaybillStore((s) => s.waybills);
  const filters = useWaybillStore((s) => s.reportFilters);
  const setReportFilters = useWaybillStore((s) => s.setReportFilters);
  const setSelectedWaybill = useWaybillStore((s) => s.setSelectedWaybill);
  const setPlaybackIndex = useWaybillStore((s) => s.setPlaybackIndex);
  const setIsPlaying = useWaybillStore((s) => s.setIsPlaying);
  const setPlaybackViewMode = useWaybillStore((s) => s.setPlaybackViewMode);

  const [sortField, setSortField] = useState<SortField>('driftCount');
  const [sortAsc, setSortAsc] = useState(false);

  const filteredWaybills = useMemo(
    () =>
      waybills.filter((w) => {
        if (filters.store && w.store !== filters.store) return false;
        if (filters.route && w.route !== filters.route) return false;
        if (filters.carrier && w.carrier !== filters.carrier) return false;
        if (filters.driver && w.driver !== filters.driver) return false;
        if (filters.cargoType && w.cargoType !== filters.cargoType) return false;
        return true;
      }),
    [waybills, filters]
  );

  const comparisonData = useMemo<RouteComparisonRow[]>(() => {
    const routes = [...new Set(filteredWaybills.map((w) => w.route))];

    return routes
      .map((route) => {
        const routeWaybills = filteredWaybills.filter((w) => w.route === route);

        const driftCount = routeWaybills.reduce(
          (sum, w) => sum + w.driftIncidents.length,
          0
        );
        const totalDriftMin = routeWaybills.reduce(
          (sum, w) => sum + w.driftIncidents.reduce((s, d) => s + d.durationMin, 0),
          0
        );
        const avgDriftMin = routeWaybills.length > 0 ? Math.round(totalDriftMin / routeWaybills.length) : 0;

        let maxStopMin = 0;
        routeWaybills.forEach((w) => {
          w.tripEvents.forEach((e) => {
            if (
              (e.type === 'parking' || e.type === 'service_area' || e.type === 'traffic_jam') &&
              e.durationMin > maxStopMin
            ) {
              maxStopMin = e.durationMin;
            }
          });
        });

        const driverMinutes: Record<string, number> = {};
        routeWaybills.forEach((w) => {
          if (!driverMinutes[w.driver]) driverMinutes[w.driver] = 0;
          driverMinutes[w.driver] += w.driftIncidents.reduce((s, d) => s + d.durationMin, 0);
        });
        const riskDrivers = Object.entries(driverMinutes)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 2)
          .map(([name, minutes]) => ({ name, minutes }));

        let worstDriftWaybill: Waybill | null = null;
        let maxDrift = 0;
        routeWaybills.forEach((w) => {
          w.driftIncidents.forEach((d) => {
            if (d.durationMin > maxDrift) {
              maxDrift = d.durationMin;
              worstDriftWaybill = w;
            }
          });
        });

        return {
          route,
          waybillCount: routeWaybills.length,
          driftCount,
          avgDriftMin,
          maxStopMin,
          riskDrivers,
          worstDriftWaybill,
        };
      })
      .sort((a, b) => {
        const mult = sortAsc ? 1 : -1;
        if (sortField === 'driftCount') return (a.driftCount - b.driftCount) * mult;
        if (sortField === 'avgDriftMin') return (a.avgDriftMin - b.avgDriftMin) * mult;
        if (sortField === 'maxStopMin') return (a.maxStopMin - b.maxStopMin) * mult;
        return (a.waybillCount - b.waybillCount) * mult;
      });
  }, [filteredWaybills, sortField, sortAsc]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const handleFilterRoute = (route: string) => {
    setReportFilters({ route });
  };

  const handleDrillToRoute = (route: string) => {
    const routeWb = filteredWaybills.filter((w) => w.route === route);
    if (routeWb.length > 0) {
      const date = dayjs(routeWb[0].departureTime).format('YYYY-MM-DD');
      setReportFilters({ route });
      setPlaybackViewMode('route', route, date);
      setSelectedWaybill(routeWb[0].id);
      setPlaybackIndex(0);
      setIsPlaying(false);
      navigate('/playback');
    }
  };

  const handleDrillToWaybill = (waybill: Waybill) => {
    setSelectedWaybill(waybill.id);
    setPlaybackIndex(0);
    setIsPlaying(false);
    setPlaybackViewMode('waybill');
    navigate('/playback');
  };

  const handleFilterDriver = (name: string) => {
    setReportFilters({ driver: name });
  };

  const formatMin = (m: number): string => {
    if (m === 0) return '—';
    if (m >= 60) return `${Math.floor(m / 60)}h${m % 60}m`;
    return `${m}m`;
  };

  const sortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortAsc ? '↓' : '↑';
  };

  const barWidth = (value: number, maxValue: number): string => {
    if (maxValue === 0) return '0%';
    return `${Math.min(100, (value / maxValue) * 100)}%`;
  };

  const maxDriftCount = Math.max(1, ...comparisonData.map((d) => d.driftCount));
  const maxAvgDrift = Math.max(1, ...comparisonData.map((d) => d.avgDriftMin));
  const maxStop = Math.max(1, ...comparisonData.map((d) => d.maxStopMin));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart4 className="w-5 h-5 text-cold-accent" />
          <h3 className="font-bold text-white">线路横向对比</h3>
          <span className="text-xs text-gray-500">
            共 {comparisonData.length} 条线路参与对比
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <ArrowUpDown className="w-3.5 h-3.5" />
          点击表头排序
        </div>
      </div>

      {comparisonData.length === 0 ? (
        <div className="bg-cold-surface/40 rounded-lg border border-cold-border p-6 text-center text-gray-500">
          <BarChart4 className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">暂无符合筛选条件的线路</p>
        </div>
      ) : (
        <div className="bg-cold-surface/40 rounded-lg border border-cold-border overflow-hidden no-print">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-cold-border/70">
                  <th className="text-left py-2.5 px-3 font-semibold text-gray-300">
                    线路名称
                  </th>
                  <th
                    className="text-center py-2.5 px-3 font-semibold text-gray-300 cursor-pointer hover:text-cold-accent transition-colors"
                    onClick={() => handleSort('driftCount')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      超温次数 {sortIcon('driftCount')}
                    </div>
                  </th>
                  <th
                    className="text-center py-2.5 px-3 font-semibold text-gray-300 cursor-pointer hover:text-cold-accent transition-colors"
                    onClick={() => handleSort('avgDriftMin')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <Clock className="w-3 h-3" />
                      平均超温 {sortIcon('avgDriftMin')}
                    </div>
                  </th>
                  <th
                    className="text-center py-2.5 px-3 font-semibold text-gray-300 cursor-pointer hover:text-cold-accent transition-colors"
                    onClick={() => handleSort('maxStopMin')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      最长停车 {sortIcon('maxStopMin')}
                    </div>
                  </th>
                  <th className="text-center py-2.5 px-3 font-semibold text-gray-300">
                    高风险司机
                  </th>
                  <th className="text-center py-2.5 px-3 font-semibold text-gray-300">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.map((row, idx) => {
                  const isFiltered = filters.route === row.route;
                  return (
                    <tr
                      key={row.route}
                      className={`border-b border-cold-border/30 hover:bg-cold-accent/5 transition-colors ${
                        isFiltered ? 'bg-cold-accent/10' : idx % 2 === 0 ? 'bg-black/10' : ''
                      }`}
                    >
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-cold-accent" />
                          <span className="font-medium text-white">{row.route}</span>
                          <span className="text-[10px] text-gray-500">
                            ({row.waybillCount} 车)
                          </span>
                          {isFiltered && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cold-accent/10 text-cold-accent border border-cold-accent/30">
                              已筛选
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-col items-center gap-1">
                          <span
                            className={`font-mono font-bold ${
                              row.driftCount === 0
                                ? 'text-normal-green'
                                : row.driftCount >= 10
                                ? 'text-alert-red'
                                : row.driftCount >= 4
                                ? 'text-warning-amber'
                                : 'text-gray-200'
                            }`}
                          >
                            {row.driftCount}
                          </span>
                          <div className="w-20 h-1.5 bg-black/30 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                row.driftCount >= 10
                                  ? 'bg-alert-red'
                                  : row.driftCount >= 4
                                  ? 'bg-warning-amber'
                                  : 'bg-cold-accent'
                              }`}
                              style={{ width: barWidth(row.driftCount, maxDriftCount) }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-col items-center gap-1">
                          <span
                            className={`font-mono font-bold ${
                              row.avgDriftMin === 0
                                ? 'text-normal-green'
                                : row.avgDriftMin >= 60
                                ? 'text-alert-red'
                                : row.avgDriftMin >= 30
                                ? 'text-warning-amber'
                                : 'text-gray-200'
                            }`}
                          >
                            {formatMin(row.avgDriftMin)}/车
                          </span>
                          <div className="w-20 h-1.5 bg-black/30 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                row.avgDriftMin >= 60
                                  ? 'bg-alert-red'
                                  : row.avgDriftMin >= 30
                                  ? 'bg-warning-amber'
                                  : 'bg-cold-accent'
                              }`}
                              style={{ width: barWidth(row.avgDriftMin, maxAvgDrift) }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span
                            className={`font-mono font-bold ${
                              row.maxStopMin === 0
                                ? 'text-normal-green'
                                : row.maxStopMin >= 60
                                ? 'text-alert-red'
                                : row.maxStopMin >= 30
                                ? 'text-warning-amber'
                                : 'text-gray-200'
                            }`}
                          >
                            {formatMin(row.maxStopMin)}
                          </span>
                          <div className="w-20 h-1.5 bg-black/30 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                row.maxStopMin >= 60
                                  ? 'bg-alert-red'
                                  : row.maxStopMin >= 30
                                  ? 'bg-warning-amber'
                                  : 'bg-cold-accent'
                              }`}
                              style={{ width: barWidth(row.maxStopMin, maxStop) }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {row.riskDrivers.length > 0 ? (
                          <div className="flex flex-col gap-1 items-center">
                            {row.riskDrivers.map((d, i) => (
                              <button
                                key={d.name}
                                onClick={() => handleFilterDriver(d.name)}
                                className={`text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 transition-colors ${
                                  filters.driver === d.name
                                    ? 'bg-cold-accent text-white'
                                    : 'bg-black/30 text-gray-300 hover:bg-black/50'
                                }`}
                              >
                                <User className="w-2.5 h-2.5" />
                                {d.name}
                                <span
                                  className={
                                    filters.driver === d.name
                                      ? 'text-white/80'
                                      : 'text-gray-400'
                                  }
                                >
                                  {formatMin(d.minutes)}
                                </span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-500 text-[10px]">无</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center justify-center gap-1.5">
                          {!isFiltered && (
                            <button
                              onClick={() => handleFilterRoute(row.route)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-black/30 text-gray-300 hover:bg-cold-accent/20 hover:text-cold-accent transition-colors"
                              title="仅显示该线路"
                            >
                              <Filter className="w-2.5 h-2.5" />
                              筛选
                            </button>
                          )}
                          <button
                            onClick={() => handleDrillToRoute(row.route)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-cold-accent text-white hover:bg-cold-light transition-colors"
                            title="线路回放"
                          >
                            <Play className="w-2.5 h-2.5" />
                            回放
                          </button>
                          {row.worstDriftWaybill && (
                            <button
                              onClick={() => handleDrillToWaybill(row.worstDriftWaybill!)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-alert-red/80 text-white hover:bg-alert-red transition-colors"
                              title="最严重运单"
                            >
                              <AlertTriangle className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
