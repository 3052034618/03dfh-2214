import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWaybillStore } from '@/store/useWaybillStore';
import {
  AlertTriangle,
  Clock,
  User,
  Building,
  ChevronRight,
  TrendingDown,
  BarChart3,
  MapPin,
  Package,
} from 'lucide-react';
import type { Waybill } from '@/types';
import dayjs from 'dayjs';

interface RouteSummary {
  route: string;
  waybills: Waybill[];
  totalDrifts: number;
  totalDriftMin: number;
  maxDriftMin: number;
  maxDriftWaybillId: string;
  longestStopMin: number;
  worstDriver: { name: string; driftCount: number; minutes: number };
  worstStore: { name: string; driftCount: number; minutes: number };
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
}

export default function RouteSummaryCard() {
  const navigate = useNavigate();
  const waybills = useWaybillStore((state) => state.waybills);
  const filters = useWaybillStore((state) => state.reportFilters);
  const setReportFilters = useWaybillStore((state) => state.setReportFilters);
  const setSelectedWaybill = useWaybillStore((state) => state.setSelectedWaybill);
  const setPlaybackIndex = useWaybillStore((state) => state.setPlaybackIndex);
  const setIsPlaying = useWaybillStore((state) => state.setIsPlaying);

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

  const routeSummaries = useMemo<RouteSummary[]>(() => {
    const routes = [...new Set(filteredWaybills.map((w) => w.route))];

    return routes
      .map((route) => {
        const routeWaybills = filteredWaybills.filter((w) => w.route === route);

        const totalDrifts = routeWaybills.reduce(
          (sum, w) => sum + w.driftIncidents.length,
          0
        );
        const totalDriftMin = routeWaybills.reduce(
          (sum, w) => sum + w.driftIncidents.reduce((s, d) => s + d.durationMin, 0),
          0
        );

        let maxDriftMin = 0;
        let maxDriftWaybillId = '';
        let longestStopMin = 0;

        routeWaybills.forEach((w) => {
          w.driftIncidents.forEach((d) => {
            if (d.durationMin > maxDriftMin) {
              maxDriftMin = d.durationMin;
              maxDriftWaybillId = w.id;
            }
          });
          w.tripEvents.forEach((e) => {
            if (
              (e.type === 'parking' || e.type === 'service_area' || e.type === 'traffic_jam') &&
              e.durationMin
            ) {
              if (e.durationMin > longestStopMin) longestStopMin = e.durationMin;
            }
          });
        });

        const driverMap: Record<string, { count: number; minutes: number }> = {};
        const storeMap: Record<string, { count: number; minutes: number }> = {};

        routeWaybills.forEach((w) => {
          const wMinutes = w.driftIncidents.reduce((s, d) => s + d.durationMin, 0);
          const wCount = w.driftIncidents.length;
          if (!driverMap[w.driver]) driverMap[w.driver] = { count: 0, minutes: 0 };
          driverMap[w.driver].count += wCount;
          driverMap[w.driver].minutes += wMinutes;
          if (!storeMap[w.store]) storeMap[w.store] = { count: 0, minutes: 0 };
          storeMap[w.store].count += wCount;
          storeMap[w.store].minutes += wMinutes;
        });

        const worstDriverEntry = Object.entries(driverMap).sort(
          (a, b) => b[1].minutes - a[1].minutes
        )[0];
        const worstStoreEntry = Object.entries(storeMap).sort(
          (a, b) => b[1].minutes - a[1].minutes
        )[0];

        let riskLevel: RouteSummary['riskLevel'] = 'low';
        const avgMinPerWaybill = routeWaybills.length > 0 ? totalDriftMin / routeWaybills.length : 0;
        if (avgMinPerWaybill >= 120 || totalDrifts >= routeWaybills.length * 4) riskLevel = 'critical';
        else if (avgMinPerWaybill >= 60 || totalDrifts >= routeWaybills.length * 2) riskLevel = 'high';
        else if (avgMinPerWaybill >= 20 || totalDrifts >= routeWaybills.length) riskLevel = 'medium';

        return {
          route,
          waybills: routeWaybills,
          totalDrifts,
          totalDriftMin,
          maxDriftMin,
          maxDriftWaybillId,
          longestStopMin,
          worstDriver: worstDriverEntry
            ? { name: worstDriverEntry[0], driftCount: worstDriverEntry[1].count, minutes: worstDriverEntry[1].minutes }
            : { name: '—', driftCount: 0, minutes: 0 },
          worstStore: worstStoreEntry
            ? { name: worstStoreEntry[0], driftCount: worstStoreEntry[1].count, minutes: worstStoreEntry[1].minutes }
            : { name: '—', driftCount: 0, minutes: 0 },
          riskLevel,
        };
      })
      .sort((a, b) => b.totalDriftMin - a.totalDriftMin);
  }, [filteredWaybills]);

  const riskStyle: Record<RouteSummary['riskLevel'], { bg: string; border: string; text: string; label: string; dot: string }> = {
    critical: {
      bg: 'bg-alert-red/15',
      border: 'border-alert-red/40',
      text: 'text-alert-red',
      label: '高危',
      dot: 'bg-alert-red',
    },
    high: {
      bg: 'bg-orange-500/15',
      border: 'border-orange-500/40',
      text: 'text-orange-400',
      label: '高风险',
      dot: 'bg-orange-500',
    },
    medium: {
      bg: 'bg-warning-amber/15',
      border: 'border-warning-amber/40',
      text: 'text-warning-amber',
      label: '中风险',
      dot: 'bg-warning-amber',
    },
    low: {
      bg: 'bg-normal-green/15',
      border: 'border-normal-green/40',
      text: 'text-normal-green',
      label: '低风险',
      dot: 'bg-normal-green',
    },
  };

  const setPlaybackViewMode = useWaybillStore((state) => state.setPlaybackViewMode);

  const handleDrillToWaybill = (waybillId: string, toDriftIndex?: number) => {
    const wb = waybills.find((w) => w.id === waybillId);
    if (wb) {
      setSelectedWaybill(waybillId);
      if (toDriftIndex !== undefined && wb.driftIncidents[toDriftIndex]) {
        setPlaybackIndex(wb.driftIncidents[toDriftIndex].startIndex);
      } else {
        setPlaybackIndex(0);
      }
      setIsPlaying(false);
      setPlaybackViewMode('waybill');
      navigate('/playback');
    }
  };

  const handleDrillToRoute = (route: string) => {
    setReportFilters({ route });
    const routeWaybills = filteredWaybills.filter((w) => w.route === route);
    if (routeWaybills.length > 0) {
      const date = dayjs(routeWaybills[0].departureTime).format('YYYY-MM-DD');
      setPlaybackViewMode('route', route, date);
      setSelectedWaybill(routeWaybills[0].id);
      setPlaybackIndex(0);
      setIsPlaying(false);
      navigate('/playback');
    }
  };

  const handleClearRouteFilter = () => {
    setReportFilters({ route: '' });
  };

  const handleDrillToDriver = (driverName: string) => {
    setReportFilters({ driver: driverName });
  };

  const handleDrillToStore = (storeName: string) => {
    setReportFilters({ store: storeName });
  };

  if (routeSummaries.length === 0) {
    return (
      <div className="bg-cold-surface/40 rounded-lg border border-cold-border p-6 text-center text-gray-500">
        <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-40" />
        <p className="text-sm">暂无符合筛选条件的线路数据</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-cold-accent" />
          <h3 className="font-bold text-white">线路复盘摘要</h3>
          <span className="text-xs text-gray-500">
            共 {routeSummaries.length} 条线路，按风险等级排序
          </span>
        </div>
        {filters.route && (
          <button
            onClick={handleClearRouteFilter}
            className="text-xs text-cold-accent hover:text-cold-light transition-colors"
          >
            清除线路筛选
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {routeSummaries.map((summary) => {
          const style = riskStyle[summary.riskLevel];
          const hours = Math.floor(summary.totalDriftMin / 60);
          const mins = summary.totalDriftMin % 60;

          return (
            <div
              key={summary.route}
              className={`rounded-lg border ${style.border} ${style.bg} p-4 transition-all hover:shadow-lg`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${style.dot} animate-pulse`}></div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-white text-base">{summary.route}</h4>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${style.text} border ${style.border} bg-black/20`}>
                        {style.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {summary.waybills.length} 车运输 · 承运商: {[...new Set(summary.waybills.map(w => w.carrier))].join('/')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDrillToRoute(summary.route)}
                  className="flex items-center gap-1 text-xs text-cold-accent hover:text-cold-light transition-colors group"
                >
                  下钻
                  <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-black/25 rounded p-2.5">
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                    <AlertTriangle className="w-3 h-3" />
                    超温次数
                  </div>
                  <div className="text-lg font-bold font-mono text-white">
                    {summary.totalDrifts}
                    <span className="text-xs text-gray-500 ml-1">次</span>
                  </div>
                </div>
                <div className="bg-black/25 rounded p-2.5">
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                    <Clock className="w-3 h-3" />
                    累计超温
                  </div>
                  <div className="text-lg font-bold font-mono text-white">
                    {hours > 0 && `${hours}h`}{mins}m
                  </div>
                </div>
                <div className="bg-black/25 rounded p-2.5">
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                    <TrendingDown className="w-3 h-3" />
                    最长停车
                  </div>
                  <div className="text-lg font-bold font-mono text-white">
                    {summary.longestStopMin > 60
                      ? `${Math.floor(summary.longestStopMin / 60)}h${summary.longestStopMin % 60}m`
                      : `${summary.longestStopMin}m`}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-start gap-2 p-2 rounded bg-black/20">
                  <div className="w-7 h-7 rounded bg-alert-red/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5 text-alert-red" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-500">风险最高司机</div>
                      {summary.worstDriver.name !== '—' && (
                        <button
                          onClick={() => handleDrillToDriver(summary.worstDriver.name)}
                          className="text-[10px] text-cold-accent hover:text-cold-light transition-colors"
                        >
                          筛选
                        </button>
                      )}
                    </div>
                    <div className="text-sm font-semibold text-white truncate">
                      {summary.worstDriver.name}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {summary.worstDriver.driftCount} 次异常 ·{' '}
                      <span className="text-alert-red font-medium">
                        {summary.worstDriver.minutes > 60
                          ? `${Math.floor(summary.worstDriver.minutes / 60)}h${summary.worstDriver.minutes % 60}m`
                          : `${summary.worstDriver.minutes}m`}{' '}
                        超温
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-2 rounded bg-black/20">
                  <div className="w-7 h-7 rounded bg-warning-amber/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Building className="w-3.5 h-3.5 text-warning-amber" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-500">风险最高门店</div>
                      {summary.worstStore.name !== '—' && (
                        <button
                          onClick={() => handleDrillToStore(summary.worstStore.name)}
                          className="text-[10px] text-cold-accent hover:text-cold-light transition-colors"
                        >
                          筛选
                        </button>
                      )}
                    </div>
                    <div className="text-sm font-semibold text-white truncate">
                      {summary.worstStore.name}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {summary.worstStore.driftCount} 次异常 ·{' '}
                      <span className="text-warning-amber font-medium">
                        {summary.worstStore.minutes > 60
                          ? `${Math.floor(summary.worstStore.minutes / 60)}h${summary.worstStore.minutes % 60}m`
                          : `${summary.worstStore.minutes}m`}{' '}
                        超温
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {summary.maxDriftWaybillId && summary.maxDriftMin > 0 && (
                <button
                  onClick={() => {
                    const wb = waybills.find((w) => w.id === summary.maxDriftWaybillId);
                    const driftIdx = wb?.driftIncidents.findIndex(
                      (d) => d.durationMin === summary.maxDriftMin
                    );
                    handleDrillToWaybill(
                      summary.maxDriftWaybillId,
                      driftIdx !== -1 ? driftIdx! : 0
                    );
                  }}
                  className="w-full mt-3 flex items-center justify-between px-3 py-2 rounded bg-black/30 hover:bg-black/40 border border-white/5 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Package className="w-3.5 h-3.5 text-alert-red" />
                    <span className="text-xs text-gray-300">
                      跳至最严重运单:
                      <span className="font-mono text-alert-red ml-1">{summary.maxDriftWaybillId}</span>
                    </span>
                  </div>
                  <span className="text-xs text-alert-red font-medium">
                    单段超温 {summary.maxDriftMin}m
                  </span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
