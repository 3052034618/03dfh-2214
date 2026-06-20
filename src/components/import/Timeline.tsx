import { useWaybillStore } from '@/store/useWaybillStore';
import { Package, Car, Clock, Users, MapPin, AlertTriangle } from 'lucide-react';
import dayjs from 'dayjs';

const eventTypeConfig = {
  loading: { icon: Package, label: '装货', color: 'text-cold-accent', bg: 'bg-cold-accent' },
  unloading: { icon: Package, label: '卸货', color: 'text-normal-green', bg: 'bg-normal-green' },
  waiting: { icon: Clock, label: '等待', color: 'text-warning-amber', bg: 'bg-warning-amber' },
  queue: { icon: Users, label: '排队', color: 'text-alert-red', bg: 'bg-alert-red' },
};

export default function Timeline() {
  const waybills = useWaybillStore((state) => state.waybills);
  const selectedWaybillId = useWaybillStore((state) => state.selectedWaybillId);

  const selectedWaybill = waybills.find((w) => w.id === selectedWaybillId);

  if (!selectedWaybill) {
    return (
      <div className="bg-cold-surface/40 rounded-lg border border-cold-border p-6 text-center text-gray-500">
        请选择一个运单查看关键节点
      </div>
    );
  }

  const totalDuration = dayjs(selectedWaybill.arrivalTime).diff(
    dayjs(selectedWaybill.departureTime),
    'minute'
  );

  const allEvents = [
    ...selectedWaybill.loadingEvents.map((e) => ({ ...e, kind: 'loading' as const })),
    ...selectedWaybill.driftIncidents.map((d) => ({
      type: 'drift' as const,
      startTime: d.startTime,
      endTime: d.endTime,
      location: d.responsibleStage,
      durationMin: d.durationMin,
      kind: 'drift' as const,
    })),
  ].sort((a, b) => dayjs(a.startTime).valueOf() - dayjs(b.startTime).valueOf());

  const getPositionPercent = (time: string) => {
    const elapsed = dayjs(time).diff(dayjs(selectedWaybill.departureTime), 'minute');
    return Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));
  };

  return (
    <div className="bg-cold-surface/40 rounded-lg border border-cold-border overflow-hidden">
      <div className="px-4 py-3 border-b border-cold-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-cold-accent" />
            <span className="text-sm font-semibold text-gray-200">关键节点时间轴</span>
          </div>
          <div className="text-xs text-gray-500">
            运单 <span className="font-mono text-cold-accent">{selectedWaybill.id}</span>
          </div>
        </div>
        <div className="mt-1 text-xs text-gray-400">
          {dayjs(selectedWaybill.departureTime).format('MM-DD HH:mm')}
          {' → '}
          {dayjs(selectedWaybill.arrivalTime).format('MM-DD HH:mm')}
          <span className="ml-2 text-gray-500">
            全程 {Math.floor(totalDuration / 60)}小时{totalDuration % 60}分
          </span>
        </div>
      </div>

      <div className="p-4">
        {/* 时间轴主体 */}
        <div className="relative h-24">
          {/* 基线 */}
          <div className="absolute top-12 left-0 right-0 h-1 bg-cold-border rounded-full"></div>

          {/* 起点标记 */}
          <div
            className="absolute top-8"
            style={{ left: '0%' }}
          >
            <div className="w-4 h-4 rounded-full bg-normal-green border-2 border-cold-bg -ml-2"></div>
            <div className="mt-2 text-xs text-gray-400 -translate-x-1/2 ml-0">
              <p className="text-normal-green font-medium">发车</p>
              <p className="font-mono">{dayjs(selectedWaybill.departureTime).format('HH:mm')}</p>
            </div>
          </div>

          {/* 终点标记 */}
          <div
            className="absolute top-8"
            style={{ left: '100%' }}
          >
            <div className="w-4 h-4 rounded-full bg-alert-red border-2 border-cold-bg -ml-2"></div>
            <div className="mt-2 text-xs text-gray-400 -translate-x-1/2 ml-0 text-right">
              <p className="text-alert-red font-medium">到达</p>
              <p className="font-mono">{dayjs(selectedWaybill.arrivalTime).format('HH:mm')}</p>
            </div>
          </div>

          {/* 事件节点 */}
          {selectedWaybill.loadingEvents.map((event, idx) => {
            const config = eventTypeConfig[event.type];
            const Icon = config.icon;
            const left = getPositionPercent(event.startTime);
            const width = (event.durationMin / totalDuration) * 100;
            const isTop = idx % 2 === 0;

            return (
              <div key={idx} className="absolute" style={{ left: `${left}%`, top: isTop ? '8px' : '72px' }}>
                <div className={`
                  relative px-2 py-1.5 rounded text-xs whitespace-nowrap
                  bg-cold-surface border ${config.color} border-current
                  shadow-lg
                `}>
                  <div className="flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5" />
                    <span className="font-medium">{config.label}</span>
                    <span className="text-gray-400">·</span>
                    <span className="font-mono">{event.durationMin}分钟</span>
                  </div>
                  <div className="text-gray-500 text-[10px] mt-0.5">{event.location}</div>
                </div>
                {/* 连接线 */}
                <div
                  className={`absolute left-2 w-px ${config.bg}`}
                  style={{
                    height: isTop ? '24px' : '16px',
                    top: isTop ? '100%' : 'auto',
                    bottom: isTop ? 'auto' : '100%',
                  }}
                ></div>
              </div>
            );
          })}

          {/* 温漂事件条 */}
          {selectedWaybill.driftIncidents.map((incident) => {
            const left = getPositionPercent(incident.startTime);
            const width = (incident.durationMin / totalDuration) * 100;

            return (
              <div
                key={incident.id}
                className="absolute top-12 -translate-y-1/2 h-6 rounded"
                style={{
                  left: `${left}%`,
                  width: `${Math.max(width, 2)}%`,
                  background: 'linear-gradient(90deg, rgba(230,57,70,0.3), rgba(230,57,70,0.6), rgba(230,57,70,0.3))',
                }}
                title={`超温 ${incident.durationMin}分钟 · 最高${incident.maxTemp}℃`}
              >
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex items-center gap-1 text-[10px] text-alert-red whitespace-nowrap">
                  <AlertTriangle className="w-3 h-3" />
                  温漂 {incident.durationMin}分
                </div>
              </div>
            );
          })}
        </div>

        {/* 图例 */}
        <div className="mt-4 pt-3 border-t border-cold-border/50 flex flex-wrap gap-4 text-xs text-gray-400">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-cold-accent"></div>
            <span>装货</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-warning-amber"></div>
            <span>等待</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-alert-red"></div>
            <span>排队/超温</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-normal-green"></div>
            <span>卸货</span>
          </div>
        </div>
      </div>
    </div>
  );
}
