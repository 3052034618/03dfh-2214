import { useWaybillStore } from '@/store/useWaybillStore';
import { useNavigate } from 'react-router-dom';
import type { DriftIncident, Waybill, LoadingEvent, TripEvent } from '@/types';
import { X, Play, Clock, MapPin, Thermometer, Lightbulb, AlertTriangle, Car, Coffee, Users, Package } from 'lucide-react';
import dayjs from 'dayjs';

interface DriftDetailPanelProps {
  incident: DriftIncident & { waybill: Waybill };
  onClose: () => void;
}

export default function DriftDetailPanel({ incident, onClose }: DriftDetailPanelProps) {
  const navigate = useNavigate();
  const setSelectedWaybill = useWaybillStore((state) => state.setSelectedWaybill);

  const waybill = incident.waybill;

  const relatedLoadingEvents = waybill.loadingEvents.filter((e) => {
    const eStart = dayjs(e.startTime);
    const eEnd = dayjs(e.endTime);
    const iStart = dayjs(incident.startTime);
    const iEnd = dayjs(incident.endTime);
    return eStart.isBefore(iEnd) && eEnd.isAfter(iStart.subtract(30, 'minute'));
  });

  const relatedTripEvents = waybill.tripEvents.filter((e) => {
    const eTime = dayjs(e.timestamp);
    const iStart = dayjs(incident.startTime);
    const iEnd = dayjs(incident.endTime);
    return eTime.isAfter(iStart.subtract(30, 'minute')) && eTime.isBefore(iEnd.add(30, 'minute'));
  });

  const driftTempRecords = waybill.temperatureRecords.filter((r) => {
    const t = dayjs(r.timestamp);
    return t.isAfter(dayjs(incident.startTime).subtract(5, 'minute')) && t.isBefore(dayjs(incident.endTime).add(5, 'minute'));
  });

  const maxTemp = driftTempRecords.length > 0
    ? Math.max(...driftTempRecords.map((r) => r.temperature))
    : incident.maxTemp;
  const minTemp = driftTempRecords.length > 0
    ? Math.min(...driftTempRecords.map((r) => r.temperature))
    : 0;
  const avgTemp = driftTempRecords.length > 0
    ? driftTempRecords.reduce((s, r) => s + r.temperature, 0) / driftTempRecords.length
    : incident.avgTemp;

  const handlePlayback = () => {
    setSelectedWaybill(waybill.id);
    navigate('/playback');
  };

  const stageColorMap: Record<string, string> = {
    '装货等待': 'bg-cold-accent/20 text-cold-accent border-cold-accent/30',
    '途中停车': 'bg-warning-amber/20 text-warning-amber border-warning-amber/30',
    '临近卸货排队': 'bg-alert-red/20 text-alert-red border-alert-red/30',
    '其他': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };

  const loadingIconMap: Record<string, typeof Package> = {
    loading: Package,
    unloading: Package,
    waiting: Clock,
    queue: Users,
  };

  const tripIconMap: Record<string, typeof Car> = {
    service_area: Coffee,
    parking: Car,
    door_open: Package,
    traffic_jam: Car,
  };

  return (
    <div className="bg-cold-surface/60 backdrop-blur-sm rounded-lg border border-cold-border overflow-hidden animate-slide-up print:animate-none print:bg-white print:text-black print:border-gray-300">
      <div className="px-4 py-3 border-b border-cold-border flex items-center justify-between print:border-gray-300">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-alert-red print:text-red-600" />
          <span className="text-sm font-bold text-gray-200 print:text-black">温漂详情</span>
          <span className="font-mono text-xs text-cold-accent print:text-blue-600">{incident.waybillId}</span>
        </div>
        <div className="flex items-center gap-2 no-print">
          <button
            onClick={handlePlayback}
            className="text-xs text-cold-accent hover:text-cold-light flex items-center gap-1 transition-colors"
          >
            <Play className="w-3 h-3" />
            回放
          </button>
          <button onClick={onClose} className="text-gray-500 hover:text-alert-red transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4 print:p-3">
        <div className="grid grid-cols-4 gap-3 print:grid-cols-4 print:gap-2">
          <div className="bg-cold-bg/50 rounded-lg p-3 print:bg-gray-100 print:border print:border-gray-200">
            <p className="text-xs text-gray-500 print:text-gray-600">超温时长</p>
            <p className="text-xl font-bold text-alert-red font-mono print:text-red-600">{incident.durationMin}<span className="text-sm ml-1">分钟</span></p>
          </div>
          <div className="bg-cold-bg/50 rounded-lg p-3 print:bg-gray-100 print:border print:border-gray-200">
            <p className="text-xs text-gray-500 print:text-gray-600">最高温度</p>
            <p className="text-xl font-bold text-alert-red font-mono print:text-red-600">{maxTemp.toFixed(1)}<span className="text-sm ml-1">℃</span></p>
          </div>
          <div className="bg-cold-bg/50 rounded-lg p-3 print:bg-gray-100 print:border print:border-gray-200">
            <p className="text-xs text-gray-500 print:text-gray-600">平均温度</p>
            <p className="text-xl font-bold text-warning-amber font-mono print:text-amber-600">{avgTemp.toFixed(1)}<span className="text-sm ml-1">℃</span></p>
          </div>
          <div className="bg-cold-bg/50 rounded-lg p-3 print:bg-gray-100 print:border print:border-gray-200">
            <p className="text-xs text-gray-500 print:text-gray-600">责任环节</p>
            <span className={`inline-block px-2 py-0.5 text-xs rounded border mt-1 ${stageColorMap[incident.responsibleStage] || stageColorMap['其他']}`}>
              {incident.responsibleStage}
            </span>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1.5 print:text-gray-700">
            <Clock className="w-3.5 h-3.5" />
            超温时段
          </h4>
          <div className="bg-cold-bg/50 rounded-lg p-3 print:bg-gray-50 print:border print:border-gray-200">
            <div className="flex items-center gap-3 text-sm">
              <span className="font-mono text-gray-300 print:text-gray-700">{dayjs(incident.startTime).format('YYYY-MM-DD HH:mm')}</span>
              <span className="text-gray-600">→</span>
              <span className="font-mono text-gray-300 print:text-gray-700">{dayjs(incident.endTime).format('YYYY-MM-DD HH:mm')}</span>
              <span className="text-xs text-gray-500 print:text-gray-500">({incident.durationMin} 分钟)</span>
            </div>
            {driftTempRecords.length > 0 && (
              <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                <Thermometer className="w-3 h-3" />
                <span>温度范围: {minTemp.toFixed(1)}℃ ~ {maxTemp.toFixed(1)}℃</span>
                <span className="mx-1">|</span>
                <span>阈值: {waybill.tempThreshold}℃</span>
                <span className="mx-1">|</span>
                <span>超标: +{(maxTemp - waybill.tempThreshold).toFixed(1)}℃</span>
              </div>
            )}
          </div>
        </div>

        {(relatedLoadingEvents.length > 0 || relatedTripEvents.length > 0) && (
          <div>
            <h4 className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1.5 print:text-gray-700">
              <MapPin className="w-3.5 h-3.5" />
              关联节点
            </h4>
            <div className="space-y-2">
              {relatedLoadingEvents.map((event, idx) => {
                const Icon = loadingIconMap[event.type] || Package;
                const typeLabel: Record<string, string> = { loading: '装货', unloading: '卸货', waiting: '等待', queue: '排队' };
                return (
                  <div key={idx} className="bg-cold-bg/50 rounded-lg p-2.5 flex items-center gap-3 print:bg-gray-50 print:border print:border-gray-200">
                    <div className="w-7 h-7 rounded bg-warning-amber/20 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-3.5 h-3.5 text-warning-amber" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-200 print:text-gray-800">{typeLabel[event.type] || event.type}</span>
                        <span className="text-xs text-gray-500 font-mono">{event.durationMin}分钟</span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">{event.location}</p>
                    </div>
                    <div className="text-xs text-gray-500 font-mono flex-shrink-0">
                      {dayjs(event.startTime).format('HH:mm')} - {dayjs(event.endTime).format('HH:mm')}
                    </div>
                  </div>
                );
              })}
              {relatedTripEvents.map((event) => {
                const Icon = tripIconMap[event.type] || Car;
                return (
                  <div key={event.id} className="bg-cold-bg/50 rounded-lg p-2.5 flex items-center gap-3 print:bg-gray-50 print:border print:border-gray-200">
                    <div className="w-7 h-7 rounded bg-cold-accent/20 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-3.5 h-3.5 text-cold-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-200 print:text-gray-800">{event.type === 'service_area' ? '服务区停靠' : event.type === 'parking' ? '途中停车' : event.type === 'door_open' ? '车门开启' : '交通拥堵'}</span>
                        <span className="text-xs text-gray-500 font-mono">{event.durationMin}分钟</span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">{event.description}</p>
                    </div>
                    <div className="text-xs text-gray-500 font-mono flex-shrink-0">
                      {dayjs(event.timestamp).format('HH:mm')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <h4 className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1.5 print:text-gray-700">
            <Lightbulb className="w-3.5 h-3.5" />
            改进建议
          </h4>
          <div className="bg-cold-bg/50 rounded-lg p-3 print:bg-gray-50 print:border print:border-gray-200">
            <p className="text-sm text-gray-300 print:text-gray-700">{incident.suggestion}</p>
          </div>
        </div>

        <div className="pt-2 border-t border-cold-border/50 print:border-gray-300">
          <div className="grid grid-cols-2 gap-3 text-xs text-gray-500 print:text-gray-600">
            <div>司机: <span className="text-gray-300 print:text-gray-800">{waybill.driver}</span></div>
            <div>线路: <span className="text-gray-300 print:text-gray-800">{waybill.route}</span></div>
            <div>承运商: <span className="text-gray-300 print:text-gray-800">{waybill.carrier}</span></div>
            <div>门店: <span className="text-gray-300 print:text-gray-800">{waybill.store}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
