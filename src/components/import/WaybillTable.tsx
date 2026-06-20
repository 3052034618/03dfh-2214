import { useWaybillStore } from '@/store/useWaybillStore';
import { Truck, AlertTriangle, CheckCircle, AlertCircle, Clock, MapPin, User } from 'lucide-react';
import dayjs from 'dayjs';

const statusConfig = {
  normal: { label: '正常', icon: CheckCircle, color: 'text-normal-green', bg: 'bg-normal-green/10', border: 'border-normal-green/30' },
  warning: { label: '预警', icon: AlertCircle, color: 'text-warning-amber', bg: 'bg-warning-amber/10', border: 'border-warning-amber/30' },
  alert: { label: '超温', icon: AlertTriangle, color: 'text-alert-red', bg: 'bg-alert-red/10', border: 'border-alert-red/30' },
};

interface WaybillTableProps {
  onSelect?: (id: string) => void;
}

export default function WaybillTable({ onSelect }: WaybillTableProps) {
  const waybills = useWaybillStore((state) => state.waybills);
  const selectedWaybillId = useWaybillStore((state) => state.selectedWaybillId);
  const setSelectedWaybill = useWaybillStore((state) => state.setSelectedWaybill);

  const handleRowClick = (id: string) => {
    setSelectedWaybill(id);
    onSelect?.(id);
  };

  return (
    <div className="bg-cold-surface/40 rounded-lg border border-cold-border overflow-hidden">
      <div className="px-4 py-3 border-b border-cold-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-cold-accent" />
          <span className="text-sm font-semibold text-gray-200">运单列表</span>
          <span className="text-xs text-gray-500">({waybills.length} 条)</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1 text-alert-red">
          <span className="w-1.5 h-1.5 rounded-full bg-alert-red"></span>
          超温 {waybills.filter(w => w.status === 'alert').length}
        </span>
          <span className="text-gray-600">|</span>
          <span className="flex items-center gap-1 text-warning-amber">
          <span className="w-1.5 h-1.5 rounded-full bg-warning-amber"></span>
          预警 {waybills.filter(w => w.status === 'warning').length}
        </span>
          <span className="text-gray-600">|</span>
          <span className="flex items-center gap-1 text-normal-green">
          <span className="w-1.5 h-1.5 rounded-full bg-normal-green"></span>
          正常 {waybills.filter(w => w.status === 'normal').length}
        </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full table-zebra">
          <thead>
            <tr className="bg-cold-bg/50 text-xs text-gray-400">
              <th className="text-left px-4 py-2 font-medium">运单号</th>
              <th className="text-left px-4 py-2 font-medium">司机</th>
              <th className="text-left px-4 py-2 font-medium">线路</th>
              <th className="text-left px-4 py-2 font-medium">承运商</th>
              <th className="text-left px-4 py-2 font-medium">门店</th>
              <th className="text-left px-4 py-2 font-medium">货物类型</th>
              <th className="text-left px-4 py-2 font-medium">发车时间</th>
              <th className="text-left px-4 py-2 font-medium">里程</th>
              <th className="text-left px-4 py-2 font-medium">状态</th>
            </tr>
          </thead>
          <tbody>
            {waybills.map((waybill) => {
              const status = statusConfig[waybill.status];
              const StatusIcon = status.icon;
              const isSelected = selectedWaybillId === waybill.id;
              return (
                <tr
                  key={waybill.id}
                  onClick={() => handleRowClick(waybill.id)}
                  className={`
                    border-t border-cold-border/50 cursor-pointer transition-colors
                    ${isSelected
                      ? 'bg-cold-accent/10'
                      : 'hover:bg-cold-surface/60'
                    }
                    ${waybill.status === 'alert' ? 'bg-alert-red/5' : ''}
                  `}
                >
                  <td className="px-4 py-3 font-mono text-sm text-cold-accent">{waybill.id}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-200">{waybill.driver}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-200">{waybill.route}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-300">{waybill.carrier}</td>
                  <td className="px-4 py-3 text-sm text-gray-300">{waybill.store}</td>
                  <td className="px-4 py-3 text-sm text-gray-300">{waybill.cargoType}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-sm text-gray-400">
                      <Clock className="w-3.5 h-3.5" />
                      {dayjs(waybill.departureTime).format('HH:mm')}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-300">{waybill.distanceKm} km</td>
                  <td className="px-4 py-3">
                    <span className={`
                      inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium
                      ${status.bg} ${status.color} border ${status.border}
                    `}>
                      <StatusIcon className="w-3 h-3" />
                      {status.label}
                      {waybill.driftIncidents.length > 0 && (
                        <span className="font-mono">({waybill.driftIncidents.length})</span>
                      )}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
