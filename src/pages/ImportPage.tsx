import { useState, useMemo, useCallback, useRef } from 'react';
import {
  Upload,
  FileText,
  MapPin,
  Clock,
  CheckCircle,
  X,
  AlertCircle,
  AlertTriangle,
  Package,
  Play,
  Loader2,
  ChevronRight,
  Layers,
  CheckSquare,
  FileWarning,
} from 'lucide-react';
import type { ImportedFileType, WaybillMergeInfo, Waybill } from '@/types';
import { useWaybillStore } from '@/store/useWaybillStore';
import { useNavigate } from 'react-router-dom';
import Timeline from '@/components/import/Timeline';
import dayjs from 'dayjs';

const fileTypeConfig: Record<
  ImportedFileType,
  { icon: typeof FileText; label: string; color: string; bg: string; short: string }
> = {
  temperature: {
    icon: FileText,
    label: '温度记录',
    color: 'text-temp-cold',
    bg: 'bg-temp-cold/10',
    short: '温度',
  },
  gps: {
    icon: MapPin,
    label: 'GPS轨迹',
    color: 'text-cold-accent',
    bg: 'bg-cold-accent/10',
    short: 'GPS',
  },
  loading: {
    icon: Clock,
    label: '装卸记录',
    color: 'text-warning-amber',
    bg: 'bg-warning-amber/10',
    short: '装卸',
  },
  unknown: {
    icon: FileText,
    label: '未知文件',
    color: 'text-gray-400',
    bg: 'bg-gray-400/10',
    short: '未知',
  },
};

const statusConfig: Record<
  WaybillMergeInfo['status'],
  { label: string; icon: any; color: string; bg: string; border: string; dot: string }
> = {
  complete: {
    label: '已就绪',
    icon: CheckCircle,
    color: 'text-normal-green',
    bg: 'bg-normal-green/10',
    border: 'border-normal-green/30',
    dot: 'bg-normal-green',
  },
  incomplete: {
    label: '待补齐',
    icon: AlertCircle,
    color: 'text-warning-amber',
    bg: 'bg-warning-amber/10',
    border: 'border-warning-amber/30',
    dot: 'bg-warning-amber',
  },
  pending: {
    label: '资料不足',
    icon: AlertTriangle,
    color: 'text-gray-400',
    bg: 'bg-gray-500/10',
    border: 'border-gray-500/30',
    dot: 'bg-gray-500',
  },
};

function detectFileType(filename: string): ImportedFileType {
  const lower = filename.toLowerCase();
  if (lower.includes('temp') || lower.includes('温度')) return 'temperature';
  if (lower.includes('gps') || lower.includes('gpx') || lower.includes('轨迹')) return 'gps';
  if (lower.includes('loading') || lower.includes('装卸') || lower.includes('load')) return 'loading';
  return 'unknown';
}

function ImportFileDropZone({
  onFiles,
  processing,
}: {
  onFiles: (files: FileList) => Promise<void>;
  processing: boolean;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        await onFiles(e.dataTransfer.files);
      }
    },
    [onFiles]
  );

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await onFiles(e.target.files);
      e.target.value = '';
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`
        relative border-2 border-dashed rounded-lg p-6 text-center transition-all duration-300 cursor-pointer
        ${isDragging
          ? 'drop-zone-active border-cold-accent'
          : 'border-cold-border hover:border-cold-light/50 bg-cold-surface/30'
        }
      `}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".csv,.txt,.gpx,.xlsx,.xls"
        className="hidden"
        onChange={handleFileInput}
      />
      <div className="flex flex-col items-center gap-2">
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            isDragging ? 'bg-cold-accent/20 scale-110' : 'bg-cold-surface'
          }`}
        >
          {processing ? (
            <Loader2 className="w-6 h-6 text-cold-accent animate-spin" />
          ) : (
            <Upload className={`w-6 h-6 ${isDragging ? 'text-cold-accent' : 'text-gray-400'}`} />
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-200">拖拽文件到此处或点击选择</p>
          <p className="text-xs text-gray-500 mt-0.5">温度记录 · GPS轨迹 · 装卸记录</p>
        </div>
        {processing && <p className="text-xs text-cold-accent">正在解析文件...</p>}
      </div>
    </div>
  );
}

function FileCard({
  file,
  onRemove,
}: {
  file: ReturnType<typeof useWaybillStore.getState>['importedFiles'][0];
  onRemove: (id: string) => void;
}) {
  const parseInfo = useWaybillStore((s) => s.fileParseInfo[file.id]);
  const config = fileTypeConfig[file.type];
  const Icon = config.icon;

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const hasErrors = parseInfo?.errors && parseInfo.errors.length > 0;
  const hasWarnings = parseInfo?.warnings && parseInfo.warnings.length > 0;

  return (
    <div
      className={`px-3 py-2.5 border-b border-cold-border/50 last:border-0 hover:bg-cold-surface/50 transition-colors ${
        hasErrors ? 'bg-alert-red/5' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${config.bg}`}
          >
            <Icon className={`w-3 h-3 ${config.color}`} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-200 truncate">{file.name}</p>
            <p className="text-[10px] text-gray-500">
              {config.label} · {formatSize(file.size)}
              {parseInfo &&
                ` · ${parseInfo.validRowCount}/${parseInfo.rowCount} 有效行`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {file.waybillId && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-normal-green/10 text-normal-green font-mono">
              {file.waybillId}
            </span>
          )}
          {hasErrors && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-alert-red/10 text-alert-red">
              {parseInfo!.errors.length} 错误
            </span>
          )}
          {!hasErrors && hasWarnings && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning-amber/10 text-warning-amber">
              {parseInfo!.warnings.length} 警告
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(file.id);
            }}
            className="text-gray-600 hover:text-alert-red transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
      {(hasErrors || hasWarnings) && (
        <div className="mt-2 ml-8 space-y-1 max-h-20 overflow-y-auto">
          {parseInfo!.errors.slice(0, 2).map((err, idx) => (
            <div
              key={idx}
              className="flex items-start gap-1 text-[10px] text-alert-red bg-alert-red/5 px-1.5 py-0.5 rounded"
            >
              <AlertCircle className="w-2.5 h-2.5 mt-0.5 flex-shrink-0" />
              <span className="truncate">{err}</span>
            </div>
          ))}
          {parseInfo!.warnings.slice(0, 2).map((w, idx) => (
            <div
              key={idx}
              className="flex items-start gap-1 text-[10px] text-warning-amber bg-warning-amber/5 px-1.5 py-0.5 rounded"
            >
              <AlertTriangle className="w-2.5 h-2.5 mt-0.5 flex-shrink-0" />
              <span className="truncate">{w}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PendingCard({
  merge,
  onBuild,
}: {
  merge: WaybillMergeInfo;
  onBuild: (waybillId: string) => void;
}) {
  const status = statusConfig[merge.status];
  const StatusIcon = status.icon;
  const allTypes: ImportedFileType[] = ['temperature', 'gps', 'loading'];
  const waybills = useWaybillStore((s) => s.waybills);
  const hasWaybill = waybills.some((w) => w.id === merge.waybillId);
  const canBuild = merge.hasTemperature && merge.hasGps;

  return (
    <div
      className={`bg-cold-surface/40 rounded-lg border ${status.border} ${status.bg} p-3 transition-all hover:shadow-md`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${status.dot} animate-pulse`}></div>
          <span className="text-sm font-mono font-bold text-cold-accent">{merge.waybillId}</span>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded border ${status.bg} ${status.color} ${status.border}`}
          >
            {status.label}
          </span>
        </div>
        {!hasWaybill && canBuild && (
          <button
            onClick={() => onBuild(merge.waybillId)}
            className="text-xs text-cold-accent hover:text-cold-light flex items-center gap-1 transition-colors"
          >
            <Package className="w-3 h-3" />
            生成运单
          </button>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        {allTypes.map((t) => {
          const has =
            t === 'temperature'
              ? merge.hasTemperature
              : t === 'gps'
              ? merge.hasGps
              : merge.hasLoading;
          const cfg = fileTypeConfig[t];
          const Icon = cfg.icon;
          return (
            <span
              key={t}
              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] flex-1 ${
                has ? cfg.bg + ' ' + cfg.color : 'bg-gray-800 text-gray-600 line-through'
              }`}
            >
              <Icon className="w-2.5 h-2.5" />
              {cfg.short}
              {has ? '' : '✕'}
            </span>
          );
        })}
      </div>
      {merge.missingTypes.length > 0 && (
        <p className="text-[10px] text-warning-amber/80 mt-2">
          缺少 <span className="font-medium">{merge.missingTypes.map((t) => fileTypeConfig[t].label).join('、')}</span>
          {merge.missingTypes.length === 1 &&
            canBuild &&
            ' · 温度+GPS已齐，可先强制生成（装卸记录后续补）'}
        </p>
      )}
    </div>
  );
}

function WaybillCard({
  waybill,
  isSelected,
  onSelect,
  onPlayback,
}: {
  waybill: Waybill;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onPlayback: (id: string) => void;
}) {
  const statusColors = {
    normal: { bg: 'bg-normal-green/10', text: 'text-normal-green', label: '正常', dot: 'bg-normal-green' },
    warning: { bg: 'bg-warning-amber/10', text: 'text-warning-amber', label: '异常', dot: 'bg-warning-amber' },
    alert: { bg: 'bg-alert-red/10', text: 'text-alert-red', label: '严重', dot: 'bg-alert-red' },
  };
  const sc = statusColors[waybill.status];
  const driftCount = waybill.driftIncidents.length;
  const totalDriftMin = waybill.driftIncidents.reduce((s, d) => s + d.durationMin, 0);

  return (
    <div
      onClick={() => onSelect(waybill.id)}
      className={`
        rounded-lg border p-3 cursor-pointer transition-all
        ${isSelected
          ? 'bg-cold-accent/10 border-cold-accent shadow-lg shadow-cold-accent/10'
          : 'bg-cold-surface/40 border-cold-border hover:border-cold-accent/50'
        }
      `}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isSelected && <CheckSquare className="w-3.5 h-3.5 text-cold-accent" />}
          <span className="text-sm font-mono font-bold text-cold-accent">{waybill.id}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${sc.bg} ${sc.text} border ${sc.text}/30`}>
            {sc.label}
          </span>
        </div>
        <div className={`w-2 h-2 rounded-full ${sc.dot}`}></div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs mb-2">
        <div className="text-gray-500">
          司机: <span className="text-gray-200">{waybill.driver}</span>
        </div>
        <div className="text-gray-500">
          门店: <span className="text-gray-200">{waybill.store}</span>
        </div>
        <div className="text-gray-500">
          里程: <span className="text-gray-200">{waybill.distanceKm} km</span>
        </div>
        <div className="text-gray-500">
          时长: <span className="text-gray-200">
            {Math.floor((waybill.temperatureRecords.length - 1) / 60)}h{(waybill.temperatureRecords.length - 1) % 60}m
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          {driftCount > 0 ? (
            <span className={`px-1.5 py-0.5 rounded ${sc.bg} ${sc.text}`}>
              {driftCount} 次超温 · {totalDriftMin}m
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded bg-normal-green/10 text-normal-green">
              全程正常
            </span>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPlayback(waybill.id);
          }}
          className="
            inline-flex items-center gap-1 px-2 py-1 rounded text-[10px]
            bg-cold-accent hover:bg-cold-light text-white
            transition-all hover:shadow-md hover:shadow-cold-accent/30
          "
        >
          <Play className="w-2.5 h-2.5" />
          回放
        </button>
      </div>
      <div className="mt-2 pt-2 border-t border-cold-border/50 text-[10px] text-gray-500">
        {dayjs(waybill.departureTime).format('MM-DD HH:mm')} →{' '}
        {dayjs(waybill.arrivalTime).format('MM-DD HH:mm')}
      </div>
    </div>
  );
}

export default function ImportPage() {
  const [processing, setProcessing] = useState(false);
  const navigate = useNavigate();
  const importedFiles = useWaybillStore((s) => s.importedFiles);
  const mergeInfo = useWaybillStore((s) => s.mergeInfo);
  const waybills = useWaybillStore((s) => s.waybills);
  const selectedWaybillId = useWaybillStore((s) => s.selectedWaybillId);
  const validationIssues = useWaybillStore((s) => s.validationIssues);
  const addImportedFile = useWaybillStore((s) => s.addImportedFile);
  const removeImportedFile = useWaybillStore((s) => s.removeImportedFile);
  const buildWaybillFromFiles = useWaybillStore((s) => s.buildWaybillFromFiles);
  const setSelectedWaybill = useWaybillStore((s) => s.setSelectedWaybill);

  const pendingMerges = useMemo(
    () =>
      mergeInfo.filter(
        (m) => m.status !== 'complete' || !waybills.some((w) => w.id === m.waybillId)
      ),
    [mergeInfo, waybills]
  );

  const readyWaybills = useMemo(
    () =>
      waybills.filter((w) =>
        mergeInfo.some((m) => m.waybillId === w.id && m.status === 'complete')
      ),
    [waybills, mergeInfo]
  );

  const selectedWaybill = useMemo(
    () => waybills.find((w) => w.id === selectedWaybillId),
    [waybills, selectedWaybillId]
  );

  const errorIssues = validationIssues.filter((v) => v.severity === 'error');
  const warningIssues = validationIssues.filter((v) => v.severity === 'warning');

  const handleFiles = async (files: FileList) => {
    const list = Array.from(files);
    if (list.length === 0) return;
    setProcessing(true);
    for (const f of list) {
      await addImportedFile(f);
    }
    setProcessing(false);
  };

  const handleGoToPlayback = (waybillId: string) => {
    setSelectedWaybill(waybillId);
    navigate('/playback');
  };

  return (
    <div className="p-6 h-[calc(100vh-140px)] overflow-hidden">
      <div className="grid grid-cols-12 gap-4 h-full">
        {/* 左列：文件区 */}
        <div className="col-span-3 flex flex-col gap-3 h-full min-h-0">
          <ImportFileDropZone onFiles={handleFiles} processing={processing} />

          {/* 文件上传统计 */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-cold-surface/50 rounded-lg p-2.5 border border-cold-border">
              <div className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-temp-cold" />
                <span className="text-[10px] text-gray-400">温度</span>
              </div>
              <p className="text-xl font-bold text-white font-mono mt-0.5">
                {importedFiles.filter((f) => f.type === 'temperature').length}
              </p>
            </div>
            <div className="bg-cold-surface/50 rounded-lg p-2.5 border border-cold-border">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-cold-accent" />
                <span className="text-[10px] text-gray-400">GPS</span>
              </div>
              <p className="text-xl font-bold text-white font-mono mt-0.5">
                {importedFiles.filter((f) => f.type === 'gps').length}
              </p>
            </div>
            <div className="bg-cold-surface/50 rounded-lg p-2.5 border border-cold-border">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-warning-amber" />
                <span className="text-[10px] text-gray-400">装卸</span>
              </div>
              <p className="text-xl font-bold text-white font-mono mt-0.5">
                {importedFiles.filter((f) => f.type === 'loading').length}
              </p>
            </div>
          </div>

          {/* 校验区 */}
          {validationIssues.length > 0 && (
            <div className="bg-cold-surface/40 rounded-lg border border-cold-border overflow-hidden flex-shrink-0">
              <div className="px-3 py-2 border-b border-cold-border flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                  <FileWarning className="w-3.5 h-3.5" />
                  数据校验
                </span>
                <div className="flex items-center gap-2 text-xs">
                  {errorIssues.length > 0 && (
                    <span className="text-alert-red">{errorIssues.length} 错误</span>
                  )}
                  {warningIssues.length > 0 && (
                    <span className="text-warning-amber">{warningIssues.length} 警告</span>
                  )}
                </div>
              </div>
              <div className="max-h-28 overflow-y-auto">
                {validationIssues.slice(0, 5).map((issue) => (
                  <div
                    key={issue.id}
                    className={`px-3 py-2 border-b border-cold-border/50 last:border-0 ${
                      issue.severity === 'error' ? 'bg-alert-red/5' : 'bg-warning-amber/5'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {issue.severity === 'error' ? (
                        <AlertCircle className="w-3 h-3 text-alert-red mt-0.5 flex-shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3 h-3 text-warning-amber mt-0.5 flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium text-gray-200">{issue.message}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          {issue.detail} · <span className="font-mono">{issue.waybillId}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 文件列表 */}
          {importedFiles.length > 0 && (
            <div className="bg-cold-surface/40 rounded-lg border border-cold-border overflow-hidden flex-1 min-h-0 flex flex-col">
              <div className="px-3 py-2 border-b border-cold-border flex items-center justify-between flex-shrink-0">
                <span className="text-xs font-semibold text-gray-300">
                  已上传 ({importedFiles.length})
                </span>
              </div>
              <div className="overflow-y-auto flex-1 min-h-0">
                {importedFiles
                  .slice()
                  .reverse()
                  .map((file) => (
                    <FileCard key={file.id} file={file} onRemove={removeImportedFile} />
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* 右列：合并看板 */}
        <div className="col-span-9 flex flex-col gap-4 h-full min-h-0">
          {/* 待补齐区 */}
          {pendingMerges.length > 0 && (
            <div className="bg-cold-surface/20 rounded-lg border border-warning-amber/20 p-3">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-4 h-4 text-warning-amber" />
                <span className="text-sm font-semibold text-gray-200">
                  待补齐 ({pendingMerges.length})
                </span>
                <span className="text-xs text-gray-500">
                  凑齐三类文件后自动进入可分析列表
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {pendingMerges.map((merge) => (
                  <PendingCard
                    key={merge.waybillId}
                    merge={merge}
                    onBuild={buildWaybillFromFiles}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 可分析列表 + 关键节点 + 回放 */}
          <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
            {/* 左侧运单卡片列表 */}
            <div className="col-span-5 flex flex-col gap-2 min-h-0">
              <div className="flex items-center gap-2 mb-1">
                <Layers className="w-4 h-4 text-normal-green" />
                <span className="text-sm font-semibold text-gray-200">
                  可分析运单 ({readyWaybills.length})
                </span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 min-h-0 pr-1">
                {readyWaybills.length === 0 ? (
                  <div className="h-40 flex items-center justify-center text-gray-500 text-sm">
                    导入文件后，凑齐温度、GPS、装卸三类即可生成运单
                  </div>
                ) : (
                  readyWaybills.map((wb) => (
                    <WaybillCard
                      key={wb.id}
                      waybill={wb}
                      isSelected={wb.id === selectedWaybillId}
                      onSelect={setSelectedWaybill}
                      onPlayback={handleGoToPlayback}
                    />
                  ))
                )}
              </div>
            </div>

            {/* 右侧关键节点 + 操作 */}
            <div className="col-span-7 flex flex-col gap-3 min-h-0">
              {selectedWaybill ? (
                <>
                  {/* 运单信息头 */}
                  <div className="bg-cold-surface/40 rounded-lg border border-cold-border p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-mono font-bold text-cold-accent">
                            {selectedWaybill.id}
                          </span>
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded ${
                              selectedWaybill.status === 'normal'
                                ? 'bg-normal-green/10 text-normal-green'
                                : selectedWaybill.status === 'warning'
                                ? 'bg-warning-amber/10 text-warning-amber'
                                : 'bg-alert-red/10 text-alert-red'
                            } border`}
                          >
                            {selectedWaybill.status === 'normal'
                              ? '正常'
                              : selectedWaybill.status === 'warning'
                              ? '异常'
                              : '严重'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {selectedWaybill.driver} · {selectedWaybill.vehiclePlate} ·{' '}
                          {selectedWaybill.carrier} · 门店 {selectedWaybill.store}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right text-xs text-gray-500">
                          <div>
                            超温 <span className="text-alert-red font-medium">
                              {selectedWaybill.driftIncidents.length} 次
                            </span>
                          </div>
                          <div>
                            里程 <span className="text-gray-200">{selectedWaybill.distanceKm} km</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleGoToPlayback(selectedWaybill.id)}
                          className="
                            inline-flex items-center gap-2 px-4 py-2 rounded
                            bg-cold-accent hover:bg-cold-light text-white text-sm font-medium
                            transition-all duration-200 hover:shadow-lg hover:shadow-cold-accent/30
                          "
                        >
                          <Play className="w-4 h-4" />
                          异常回放
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 关键节点时间轴 */}
                  <div className="flex-1 min-h-0">
                    <Timeline />
                  </div>

                  {/* 装卸时间信息 */}
                  {selectedWaybill.loadingEvents.length > 0 && (
                    <div className="bg-cold-surface/40 rounded-lg border border-cold-border p-3">
                      <div className="text-xs font-semibold text-gray-300 mb-2 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-warning-amber" />
                        装卸时间线
                      </div>
                      <div className="flex gap-2 text-xs overflow-x-auto pb-1">
                        {selectedWaybill.loadingEvents.map((ev, idx) => (
                          <div
                            key={idx}
                            className="flex-shrink-0 bg-black/20 rounded px-2.5 py-2 border border-cold-border/50"
                          >
                            <div className="text-[10px] text-gray-500">{ev.type}</div>
                            <div className="font-medium text-gray-200">{ev.location}</div>
                            <div className="text-[10px] text-gray-400 mt-1">
                              {dayjs(ev.startTime).format('HH:mm')} → {dayjs(ev.endTime).format('HH:mm')}
                            </div>
                            <div className="text-[10px] text-warning-amber mt-0.5">
                              {ev.durationMin} 分钟
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">选择左侧运单查看关键节点和回放入口</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
