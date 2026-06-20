import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWaybillStore } from '@/store/useWaybillStore';
import { AlertTriangle, Play, FileText, Lightbulb, ChevronRight, ChevronDown } from 'lucide-react';
import dayjs from 'dayjs';
import type { DriftIncident, Waybill } from '@/types';
import DriftDetailPanel from './DriftDetailPanel';

interface DriftItem extends DriftIncident {
  waybillId: string;
  driver: string;
  route: string;
  carrier: string;
  store: string;
  cargoType: string;
  waybill: Waybill;
}

export default function DriftTable() {
  const waybills = useWaybillStore((state) => state.waybills);
  const filters = useWaybillStore((state) => state.reportFilters);
  const setSelectedWaybill = useWaybillStore((state) => state.setSelectedWaybill);
  const navigate = useNavigate();

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const driftItems = useMemo<DriftItem[]>(() => {
    const items: DriftItem[] = [];

    waybills.forEach((waybill) => {
      if (filters.store && waybill.store !== filters.store) return;
      if (filters.route && waybill.route !== filters.route) return;
      if (filters.carrier && waybill.carrier !== filters.carrier) return;
      if (filters.driver && waybill.driver !== filters.driver) return;
      if (filters.cargoType && waybill.cargoType !== filters.cargoType) return;
      if (filters.dateRange.start) {
        if (dayjs(waybill.departureTime).isBefore(filters.dateRange.start)) return;
      }
      if (filters.dateRange.end) {
        if (dayjs(waybill.departureTime).isAfter(filters.dateRange.end + ' 23:59:59')) return;
      }

      waybill.driftIncidents.forEach((incident) => {
        items.push({
          ...incident,
          waybillId: waybill.id,
          driver: waybill.driver,
          route: waybill.route,
          carrier: waybill.carrier,
          store: waybill.store,
          cargoType: waybill.cargoType,
          waybill,
        });
      });
    });

    return items.sort((a, b) => dayjs(b.startTime).valueOf() - dayjs(a.startTime).valueOf());
  }, [waybills, filters]);

  const totalDriftMinutes = driftItems.reduce((sum, item) => sum + item.durationMin, 0);
  const avgMaxTemp = driftItems.length > 0
    ? driftItems.reduce((sum, item) => sum + item.maxTemp, 0) / driftItems.length
    : 0;

  const getSeverityColor = (duration: number, maxTemp: number, threshold: number) => {
    const overTemp = maxTemp - threshold;
    if (overTemp > 3 || duration > 60) return 'text-alert-red';
    if (overTemp > 1 || duration > 30) return 'text-warning-amber';
    return 'text-normal-green';
  };

  const stageColors: Record<string, string> = {
    '装货等待': 'bg-cold-accent/20 text-cold-accent border-cold-accent/30',
    '途中停车': 'bg-warning-amber/20 text-warning-amber border-warning-amber/30',
    '临近卸货排队': 'bg-alert-red/20 text-alert-red border-alert-red/30',
    '其他': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };

  const handlePlayback = (waybillId: string) => {
    setSelectedWaybill(waybillId);
    navigate('/playback');
  };

  const handleRowExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const expandedItem = driftItems.find((i) => i.id === expandedId);

  return (
    <div className="space-y-4">
      <div className="bg-cold-surface/40 rounded-lg border border-cold-border overflow-hidden">
        <div className="px-4 py-3 border-b border-cold-border flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-alert-red" />
              <span className="text-sm font-semibold text-gray-200">温漂清单</span>
              <span className="text-xs text-gray-500">({driftItems.length} 条)</span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="text-gray-400">
              总超温时长:
              <span className="ml-1 font-mono font-bold text-alert-red">
                {Math.floor(totalDriftMinutes / 60)}h {totalDriftMinutes % 60}m
              </span>
            </div>
            <div className="text-gray-400">
              平均最高温:
              <span className="ml-1 font-mono font-bold text-warning-amber">
                {avgMaxTemp.toFixed(1)}℃
              </span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full table-zebra">
            <thead className="sticky top-0 bg-cold-bg z-10">
              <tr className="text-xs text-gray-400">
                <th className="w-8 px-2 py-2.5"></th>
                <th className="text-left px-3 py-2.5 font-medium">运单号</th>
                <th className="text-left px-3 py-2.5 font-medium">门店</th>
                <th className="text-left px-3 py-2.5 font-medium">线路</th>
                <th className="text-left px-3 py-2.5 font-medium">司机</th>
                <th className="text-left px-3 py-2.5 font-medium">承运商</th>
                <th className="text-left px-3 py-2.5 font-medium">货物</th>
                <th className="text-left px-3 py-2.5 font-medium">发生时段</th>
                <th className="text-right px-3 py-2.5 font-medium">超温时长</th>
                <th className="text-right px-3 py-2.5 font-medium">最高温度</th>
                <th className="text-center px-3 py-2.5 font-medium">责任环节</th>
                <th className="text-left px-3 py-2.5 font-medium">改进建议</th>
                <th className="text-center px-3 py-2.5 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {driftItems.map((item) => {
                const severityColor = getSeverityColor(item.durationMin, item.maxTemp, item.waybill.tempThreshold);
                const isExpanded = expandedId === item.id;
                return (
                  <>
                    <tr
                      key={item.id}
                      onClick={() => handleRowExpand(item.id)}
                      className={`border-t border-cold-border/50 hover:bg-cold-surface/60 transition-colors cursor-pointer ${isExpanded ? 'bg-cold-accent/5' : ''}`}
                    >
                      <td className="px-2 py-3 text-gray-500">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </td>
                      <td className="px-3 py-3 font-mono text-sm text-cold-accent">{item.waybillId}</td>
                      <td className="px-3 py-3 text-sm text-gray-200">{item.store}</td>
                      <td className="px-3 py-3 text-sm text-gray-300">{item.route}</td>
                      <td className="px-3 py-3 text-sm text-gray-300">{item.driver}</td>
                      <td className="px-3 py-3 text-sm text-gray-300">{item.carrier}</td>
                      <td className="px-3 py-3 text-sm text-gray-300">{item.cargoType}</td>
                      <td className="px-3 py-3">
                        <div className="text-xs text-gray-400">
                          <div>{dayjs(item.startTime).format('MM-DD HH:mm')}</div>
                          <div className="text-gray-500">→ {dayjs(item.endTime).format('HH:mm')}</div>
                        </div>
                      </td>
                      <td className={`px-3 py-3 text-right font-mono text-sm font-bold ${severityColor}`}>
                        {item.durationMin} 分
                      </td>
                      <td className={`px-3 py-3 text-right font-mono text-sm font-bold ${severityColor}`}>
                        {item.maxTemp.toFixed(1)}℃
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 text-xs rounded border ${stageColors[item.responsibleStage] || stageColors['其他']}`}>
                          {item.responsibleStage}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-xs text-gray-400 max-w-[200px] line-clamp-2" title={item.suggestion}>
                          <Lightbulb className="w-3 h-3 inline mr-1 text-warning-amber" />
                          {item.suggestion}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handlePlayback(item.waybillId)}
                          className="text-cold-accent hover:text-cold-light text-xs flex items-center gap-1 mx-auto transition-colors"
                        >
                          <Play className="w-3 h-3" />
                          回放
                        </button>
                      </td>
                    </tr>
                  </>
                );
              })}
              {driftItems.length === 0 && (
                <tr>
                  <td colSpan={13} className="px-4 py-12 text-center text-gray-500">
                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>暂无符合条件的温漂记录</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {expandedItem && (
        <DriftDetailPanel
          incident={expandedItem}
          onClose={() => setExpandedId(null)}
        />
      )}
    </div>
  );
}
