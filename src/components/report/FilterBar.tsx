import { useWaybillStore } from '@/store/useWaybillStore';
import { Filter, Store, MapPin, Truck, User, Package, Calendar, RotateCcw } from 'lucide-react';
import { getStores, getRoutes, getCarriers, getDrivers, getCargoTypes } from '@/utils/mockData';

export default function FilterBar() {
  const filters = useWaybillStore((state) => state.reportFilters);
  const setReportFilters = useWaybillStore((state) => state.setReportFilters);

  const stores = ['', ...getStores()];
  const routes = ['', ...getRoutes()];
  const carriers = ['', ...getCarriers()];
  const drivers = ['', ...getDrivers()];
  const cargoTypes = ['', ...getCargoTypes()];

  const handleReset = () => {
    setReportFilters({
      store: '',
      route: '',
      carrier: '',
      driver: '',
      cargoType: '',
      dateRange: { start: '', end: '' },
    });
  };

  const SelectField = ({
    label,
    icon: Icon,
    value,
    options,
    onChange,
  }: {
    label: string;
    icon: any;
    value: string;
    options: string[];
    onChange: (v: string) => void;
  }) => (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-500 flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="
          h-8 px-2 py-1 rounded text-sm bg-cold-bg border border-cold-border
          text-gray-200 focus:outline-none focus:border-cold-accent
          transition-colors cursor-pointer
        "
      >
        {options.map((opt) => (
          <option key={opt || 'all'} value={opt}>
            {opt || '全部'}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="bg-cold-surface/50 rounded-lg border border-cold-border p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-cold-accent" />
          <span className="text-sm font-semibold text-gray-200">筛选条件</span>
        </div>
        <button
          onClick={handleReset}
          className="text-xs text-gray-400 hover:text-cold-accent flex items-center gap-1 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          重置筛选
        </button>
      </div>

      <div className="grid grid-cols-6 gap-4">
        <SelectField
          label="门店"
          icon={Store}
          value={filters.store}
          options={stores}
          onChange={(v) => setReportFilters({ store: v })}
        />
        <SelectField
          label="线路"
          icon={MapPin}
          value={filters.route}
          options={routes}
          onChange={(v) => setReportFilters({ route: v })}
        />
        <SelectField
          label="承运商"
          icon={Truck}
          value={filters.carrier}
          options={carriers}
          onChange={(v) => setReportFilters({ carrier: v })}
        />
        <SelectField
          label="司机"
          icon={User}
          value={filters.driver}
          options={drivers}
          onChange={(v) => setReportFilters({ driver: v })}
        />
        <SelectField
          label="货物类型"
          icon={Package}
          value={filters.cargoType}
          options={cargoTypes}
          onChange={(v) => setReportFilters({ cargoType: v })}
        />
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            日期范围
          </label>
          <div className="flex items-center gap-1">
            <input
              type="date"
              value={filters.dateRange.start}
              onChange={(e) =>
                setReportFilters({ dateRange: { ...filters.dateRange, start: e.target.value } })
              }
              className="
                flex-1 h-8 px-2 py-1 rounded text-xs bg-cold-bg border border-cold-border
                text-gray-200 focus:outline-none focus:border-cold-accent
                transition-colors
              "
            />
            <span className="text-gray-500 text-xs">至</span>
            <input
              type="date"
              value={filters.dateRange.end}
              onChange={(e) =>
                setReportFilters({ dateRange: { ...filters.dateRange, end: e.target.value } })
              }
              className="
                flex-1 h-8 px-2 py-1 rounded text-xs bg-cold-bg border border-cold-border
                text-gray-200 focus:outline-none focus:border-cold-accent
                transition-colors
              "
            />
          </div>
        </div>
      </div>
    </div>
  );
}
