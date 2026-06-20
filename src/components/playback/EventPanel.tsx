import { useMemo } from 'react';
import { useWaybillStore } from '@/store/useWaybillStore';
import { Coffee, Car, AlertTriangle, Package, Users, Thermometer, Clock } from 'lucide-react';
import type { Waybill, TripEvent, LoadingEvent, DriftIncident } from '@/types';
import dayjs from 'dayjs';

interface EventPanelProps {
  waybill: Waybill;
  currentIndex: number;
}

interface DisplayEvent {
  id: string;
  timestamp: string;
  index: number;
  type: string;
  icon: string;
  title: string;
  description: string;
  temperature?: number;
  durationMin?: number;
}

export default function EventPanel({ waybill, currentIndex }: EventPanelProps) {
  const events = useMemo<DisplayEvent[]>(() => {
    const result: DisplayEvent[] = [];

    waybill.loadingEvents.forEach((event, idx) => {
      const typeLabels: Record<string, { icon: string; title: string }> = {
        loading: { icon: 'loading', title: '装货开始' },
        unloading: { icon: 'unloading', title: '卸货开始' },
        waiting: { icon: 'waiting', title: '等待中' },
        queue: { icon: 'queue', title: '卸货排队' },
      };
      const config = typeLabels[event.type] || { icon: 'other', title: event.type };
      const startIdx = Math.max(0, dayjs(event.startTime).diff(dayjs(waybill.departureTime), 'minute'));

      result.push({
        id: `loading-${idx}`,
        timestamp: event.startTime,
        index: startIdx,
        type: event.type,
        icon: config.icon,
        title: config.title,
        description: `${event.location}，预计${event.durationMin}分钟`,
        durationMin: event.durationMin,
      });
    });

    waybill.tripEvents.forEach((event) => {
      const typeConfig: Record<string, { icon: string; title: string }> = {
        service_area: { icon: 'service', title: '服务区停靠' },
        parking: { icon: 'parking', title: '途中停车' },
        door_open: { icon: 'door', title: '车厢门开启' },
        traffic_jam: { icon: 'traffic', title: '交通拥堵' },
      };
      const config = typeConfig[event.type] || { icon: 'other', title: event.type };

      result.push({
        id: event.id,
        timestamp: event.timestamp,
        index: event.positionIndex,
        type: event.type,
        icon: config.icon,
        title: `${config.title} ${event.durationMin}分钟`,
        description: event.description,
        temperature: event.tempAfter,
        durationMin: event.durationMin,
      });

      if (event.type === 'service_area' || event.type === 'parking') {
        const driftStartIdx = event.positionIndex + 5;
        result.push({
          id: `${event.id}-drift`,
          timestamp: dayjs(event.timestamp).add(5, 'minute').format('YYYY-MM-DD HH:mm:ss'),
          index: driftStartIdx,
          type: 'drift_start',
          icon: 'drift',
          title: '温度开始缓慢上升',
          description: `停靠${event.durationMin}分钟后开始缓慢升温，可能影响货品品质`,
        });
      }
    });

    waybill.driftIncidents.forEach((incident) => {
      result.push({
        id: incident.id,
        timestamp: incident.startTime,
        index: incident.startIndex,
        type: 'drift_peak',
        icon: 'alert',
        title: `超温 ${incident.durationMin} 分钟`,
        description: `最高温度 ${incident.maxTemp}℃，责任环节：${incident.responsibleStage}`,
        temperature: incident.maxTemp,
        durationMin: incident.durationMin,
      });
    });

    result.push({
      id: 'departure',
      timestamp: waybill.departureTime,
      index: 0,
      type: 'departure',
      icon: 'departure',
      title: '车辆发车',
      description: `${waybill.route} · ${waybill.store}`,
    });

    result.push({
      id: 'arrival',
      timestamp: waybill.arrivalTime,
      index: waybill.temperatureRecords.length - 1,
      type: 'arrival',
      icon: 'arrival',
      title: '到达目的地',
      description: `全程 ${waybill.distanceKm} km，运输完成`,
    });

    return result.sort((a, b) => a.index - b.index);
  }, [waybill]);

  const visibleEvents = useMemo(() => {
    return events.filter((e) => e.index <= currentIndex);
  }, [events, currentIndex]);

  const latestEvent = visibleEvents[visibleEvents.length - 1];

  const getIconComponent = (iconType: string) => {
    switch (iconType) {
      case 'loading':
        return <Package className="w-4 h-4" />;
      case 'unloading':
        return <Package className="w-4 h-4" />;
      case 'waiting':
        return <Clock className="w-4 h-4" />;
      case 'queue':
        return <Users className="w-4 h-4" />;
      case 'service':
        return <Coffee className="w-4 h-4" />;
      case 'parking':
        return <Car className="w-4 h-4" />;
      case 'drift':
      case 'drift_start':
      case 'drift_peak':
      case 'alert':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Thermometer className="w-4 h-4" />;
    }
  };

  const getEventColor = (type: string) => {
    if (type.includes('drift') || type === 'alert') return 'text-alert-red border-alert-red/30 bg-alert-red/10';
    if (type === 'queue' || type === 'waiting') return 'text-warning-amber border-warning-amber/30 bg-warning-amber/10';
    if (type === 'service' || type === 'parking') return 'text-cold-accent border-cold-accent/30 bg-cold-accent/10';
    if (type === 'loading' || type === 'unloading') return 'text-normal-green border-normal-green/30 bg-normal-green/10';
    if (type === 'departure' || type === 'arrival') return 'text-gray-300 border-gray-500/30 bg-gray-500/10';
    return 'text-gray-400 border-gray-600/30 bg-gray-600/10';
  };

  return (
    <div className="bg-cold-surface/40 rounded-lg border border-cold-border h-full flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-cold-border">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-warning-amber" />
          <span className="text-sm font-semibold text-gray-200">事件说明</span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">
          已发生 {visibleEvents.length} / {events.length} 个事件
        </p>
      </div>

      {/* 最新事件高亮 */}
      {latestEvent && (
        <div className={`p-4 border-b border-cold-border ${getEventColor(latestEvent.type)}`}>
          <div className="flex items-start gap-3">
            <div className="mt-0.5">{getIconComponent(latestEvent.icon)}</div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm">{latestEvent.title}</p>
                <span className="text-xs font-mono opacity-70">
                  {dayjs(latestEvent.timestamp).format('HH:mm')}
                </span>
              </div>
              <p className="text-sm opacity-80 mt-1">{latestEvent.description}</p>
              {latestEvent.temperature !== undefined && (
                <p className="text-xs mt-2 font-mono">
                  温度: <span className="font-bold">{latestEvent.temperature}℃</span>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 事件列表 */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {visibleEvents.slice().reverse().map((event, idx) => {
          const colorClass = getEventColor(event.type);
          const isLatest = idx === 0;
          return (
            <div
              key={event.id}
              className={`
                px-3 py-2 rounded border transition-all duration-300
                ${isLatest ? colorClass : 'border-transparent bg-transparent hover:bg-cold-surface/30'}
                animate-fade-in
              `}
              style={{ animationDelay: `${idx * 30}ms` }}
            >
              <div className="flex items-center gap-2">
                <div className={`${isLatest ? '' : 'text-gray-500'}`}>
                  {getIconComponent(event.icon)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium truncate ${isLatest ? '' : 'text-gray-300'}`}>
                      {event.title}
                    </span>
                    <span className="text-xs font-mono text-gray-500 flex-shrink-0">
                      {dayjs(event.timestamp).format('HH:mm')}
                    </span>
                  </div>
                  <p className={`text-xs mt-0.5 ${isLatest ? 'opacity-80' : 'text-gray-500'}`}>
                    {event.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        {/* 即将到来的事件预览 */}
        {events.filter((e) => e.index > currentIndex).length > 0 && (
          <div className="mt-3 pt-3 border-t border-cold-border/50">
            <p className="text-xs text-gray-600 mb-2 px-2">即将到来</p>
            {events
              .filter((e) => e.index > currentIndex)
              .slice(0, 2)
              .map((event) => (
                <div
                  key={event.id}
                  className="px-3 py-2 opacity-40"
                >
                  <div className="flex items-center gap-2">
                    <div className="text-gray-600">{getIconComponent(event.icon)}</div>
                    <span className="text-sm text-gray-500">{event.title}</span>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
