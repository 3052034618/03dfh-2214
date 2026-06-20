import { useMemo } from 'react';
import { useWaybillStore } from '@/store/useWaybillStore';
import FilterBar from '@/components/report/FilterBar';
import DriftTable from '@/components/report/DriftTable';
import RouteSummaryCard from '@/components/report/RouteSummaryCard';
import RouteComparisonPanel from '@/components/report/RouteComparisonPanel';
import { Printer, FileDown, TrendingUp, AlertTriangle, Clock, Award } from 'lucide-react';
import dayjs from 'dayjs';

export default function ReportPage() {
  const waybills = useWaybillStore((state) => state.waybills);
  const filters = useWaybillStore((state) => state.reportFilters);

  const stats = useMemo(() => {
    const filteredWaybills = waybills.filter((w) => {
      if (filters.store && w.store !== filters.store) return false;
      if (filters.route && w.route !== filters.route) return false;
      if (filters.carrier && w.carrier !== filters.carrier) return false;
      if (filters.driver && w.driver !== filters.driver) return false;
      if (filters.cargoType && w.cargoType !== filters.cargoType) return false;
      return true;
    });

    const totalWaybills = filteredWaybills.length;
    const alertWaybills = filteredWaybills.filter((w) => w.status === 'alert').length;
    const warningWaybills = filteredWaybills.filter((w) => w.status === 'warning').length;
    const normalWaybills = filteredWaybills.filter((w) => w.status === 'normal').length;

    const totalDriftMin = filteredWaybills.reduce(
      (sum, w) => sum + w.driftIncidents.reduce((s, i) => s + i.durationMin, 0),
      0
    );

    const driftCount = filteredWaybills.reduce(
      (sum, w) => sum + w.driftIncidents.length,
      0
    );

    const passRate = totalWaybills > 0 ? ((normalWaybills / totalWaybills) * 100).toFixed(1) : '0';

    return {
      totalWaybills,
      alertWaybills,
      warningWaybills,
      normalWaybills,
      totalDriftMin,
      driftCount,
      passRate,
    };
  }, [waybills, filters]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 space-y-4">
      {/* 页面标题和操作 */}
      <div className="no-print flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">质控报告</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            生成日期: {dayjs().format('YYYY年MM月DD日')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="
              inline-flex items-center gap-2 px-4 py-2 rounded
              bg-cold-accent hover:bg-cold-light text-white text-sm font-medium
              transition-all hover:shadow-lg hover:shadow-cold-accent/30
            "
          >
            <Printer className="w-4 h-4" />
            打印报告
          </button>
          <button className="
            inline-flex items-center gap-2 px-4 py-2 rounded
            border border-cold-border text-gray-300 hover:bg-cold-surface text-sm
            transition-colors
          ">
            <FileDown className="w-4 h-4" />
            导出Excel
          </button>
        </div>
      </div>

      {/* 打印专用标题 */}
      <div className="print-only hidden text-center mb-6">
        <h1 className="text-2xl font-bold text-black">冷链运输温漂质控报告</h1>
        <p className="text-sm text-gray-600 mt-1">报告周期: {dayjs().format('YYYY年MM月DD日')}</p>
      </div>

      {/* 筛选栏 */}
      <div className="no-print">
        <FilterBar />
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-cold-surface/40 rounded-lg border border-cold-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cold-accent/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-cold-accent" />
            </div>
            <div>
              <p className="text-xs text-gray-500">运单总数</p>
              <p className="text-2xl font-bold text-white font-mono">{stats.totalWaybills}</p>
            </div>
          </div>
        </div>

        <div className="bg-cold-surface/40 rounded-lg border border-cold-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-alert-red/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-alert-red" />
            </div>
            <div>
              <p className="text-xs text-gray-500">异常运单</p>
              <p className="text-2xl font-bold text-alert-red font-mono">
                {stats.alertWaybills + stats.warningWaybills}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-cold-surface/40 rounded-lg border border-cold-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-warning-amber/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-warning-amber" />
            </div>
            <div>
              <p className="text-xs text-gray-500">累计超温</p>
              <p className="text-2xl font-bold text-warning-amber font-mono">
                {Math.floor(stats.totalDriftMin / 60)}h {stats.totalDriftMin % 60}m
              </p>
            </div>
          </div>
        </div>

        <div className="bg-cold-surface/40 rounded-lg border border-cold-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-normal-green/20 flex items-center justify-center">
              <Award className="w-5 h-5 text-normal-green" />
            </div>
            <div>
              <p className="text-xs text-gray-500">合格率</p>
              <p className="text-2xl font-bold text-normal-green font-mono">{stats.passRate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* 线路复盘摘要 */}
      <div className="no-print">
        <RouteSummaryCard />
      </div>

      {/* 线路横向对比 */}
      <div className="no-print">
        <RouteComparisonPanel />
      </div>

      {/* 温漂清单表格 */}
      <DriftTable />

      {/* 打印页脚 */}
      <div className="print-only hidden mt-8 pt-4 border-t border-gray-300 text-center text-sm text-gray-600">
        <p>报告生成时间: {dayjs().format('YYYY-MM-DD HH:mm:ss')}</p>
        <p className="mt-1">质控主管签字: _______________</p>
      </div>
    </div>
  );
}
