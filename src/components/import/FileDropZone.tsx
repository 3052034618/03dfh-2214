import { useState, useCallback, useRef } from 'react';
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
} from 'lucide-react';
import type { ImportedFileType, WaybillMergeInfo } from '@/types';
import { useWaybillStore, extractWaybillId } from '@/store/useWaybillStore';
import { useNavigate } from 'react-router-dom';

const fileTypeConfig: Record<
  ImportedFileType,
  { icon: typeof FileText; label: string; color: string; bg: string }
> = {
  temperature: { icon: FileText, label: '温度记录', color: 'text-temp-cold', bg: 'bg-temp-cold/10' },
  gps: { icon: MapPin, label: 'GPS轨迹', color: 'text-cold-accent', bg: 'bg-cold-accent/10' },
  loading: { icon: Clock, label: '装卸记录', color: 'text-warning-amber', bg: 'bg-warning-amber/10' },
  unknown: { icon: FileText, label: '未知文件', color: 'text-gray-400', bg: 'bg-gray-400/10' },
};

const typeShortLabel: Record<ImportedFileType, string> = {
  temperature: '温度',
  gps: 'GPS',
  loading: '装卸',
  unknown: '未知',
};

const statusConfig: Record<
  WaybillMergeInfo['status'],
  { label: string; icon: any; color: string; bg: string; border: string }
> = {
  complete: {
    label: '已就绪',
    icon: CheckCircle,
    color: 'text-normal-green',
    bg: 'bg-normal-green/10',
    border: 'border-normal-green/30',
  },
  incomplete: {
    label: '待补齐',
    icon: AlertCircle,
    color: 'text-warning-amber',
    bg: 'bg-warning-amber/10',
    border: 'border-warning-amber/30',
  },
  pending: {
    label: '资料不足',
    icon: AlertTriangle,
    color: 'text-gray-400',
    bg: 'bg-gray-500/10',
    border: 'border-gray-500/30',
  },
};

export default function FileDropZone() {
  const [isDragging, setIsDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const importedFiles = useWaybillStore((state) => state.importedFiles);
  const mergeInfo = useWaybillStore((state) => state.mergeInfo);
  const validationIssues = useWaybillStore((state) => state.validationIssues);
  const waybills = useWaybillStore((state) => state.waybills);
  const addImportedFile = useWaybillStore((state) => state.addImportedFile);
  const removeImportedFile = useWaybillStore((state) => state.removeImportedFile);
  const buildWaybillFromFiles = useWaybillStore((state) => state.buildWaybillFromFiles);
  const setSelectedWaybill = useWaybillStore((state) => state.setSelectedWaybill);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const detectFileType = (filename: string): ImportedFileType => {
    const lower = filename.toLowerCase();
    if (lower.includes('temp') || lower.includes('温度')) return 'temperature';
    if (lower.includes('gps') || lower.includes('gpx') || lower.includes('轨迹')) return 'gps';
    if (lower.includes('loading') || lower.includes('装卸') || lower.includes('load')) return 'loading';
    return 'unknown';
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;
    setProcessing(true);
    for (const f of list) {
      await addImportedFile(f);
    }
    setProcessing(false);
  };

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      await handleFiles(e.dataTransfer.files);
    },
    [addImportedFile]
  );

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      await handleFiles(e.target.files);
      e.target.value = '';
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const completeCount = mergeInfo.filter((m) => m.status === 'complete').length;
  const incompleteCount = mergeInfo.filter((m) => m.status === 'incomplete').length;
  const pendingCount = mergeInfo.filter((m) => m.status === 'pending').length;
  const errorIssues = validationIssues.filter((v) => v.severity === 'error');
  const warningIssues = validationIssues.filter((v) => v.severity === 'warning');

  const handleBuildWaybill = (waybillId: string) => {
    buildWaybillFromFiles(waybillId);
  };

  const handleGoToPlayback = (waybillId: string) => {
    const exists = waybills.some((w) => w.id === waybillId);
    if (exists) {
      setSelectedWaybill(waybillId);
      navigate('/playback');
    }
  };

  return (
    <div className="space-y-4">
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
            <p className="text-sm font-medium text-gray-200">
              拖拽文件到此处或点击选择
            </p>
            <p className="text-xs text-gray-500 mt-0.5">温度记录 · GPS轨迹 · 装卸记录</p>
          </div>
          {processing && (
            <p className="text-xs text-cold-accent">正在解析文件...</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-cold-surface/50 rounded-lg p-2.5 border border-cold-border">
          <div className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-temp-cold" />
            <span className="text-xs text-gray-400">温度</span>
          </div>
          <p className="text-xl font-bold text-white font-mono mt-0.5">
            {importedFiles.filter((f) => f.type === 'temperature').length}
          </p>
        </div>
        <div className="bg-cold-surface/50 rounded-lg p-2.5 border border-cold-border">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-cold-accent" />
            <span className="text-xs text-gray-400">GPS</span>
          </div>
          <p className="text-xl font-bold text-white font-mono mt-0.5">
            {importedFiles.filter((f) => f.type === 'gps').length}
          </p>
        </div>
        <div className="bg-cold-surface/50 rounded-lg p-2.5 border border-cold-border">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-warning-amber" />
            <span className="text-xs text-gray-400">装卸</span>
          </div>
          <p className="text-xl font-bold text-white font-mono mt-0.5">
            {importedFiles.filter((f) => f.type === 'loading').length}
          </p>
        </div>
      </div>

      {mergeInfo.length > 0 && (
        <div className="bg-cold-surface/40 rounded-lg border border-cold-border overflow-hidden">
          <div className="px-3 py-2 border-b border-cold-border">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-300">运单合并进度</span>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-normal-green">{completeCount} 已就绪</span>
                {incompleteCount > 0 && (
                  <span className="text-warning-amber">{incompleteCount} 待补</span>
                )}
                {pendingCount > 0 && (
                  <span className="text-gray-500">{pendingCount} 资料不足</span>
                )}
              </div>
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto">
            {mergeInfo.map((merge) => {
              const allTypes: ImportedFileType[] = ['temperature', 'gps', 'loading'];
              const status = statusConfig[merge.status];
              const StatusIcon = status.icon;
              const hasWaybill = waybills.some((w) => w.id === merge.waybillId);

              return (
                <div
                  key={merge.waybillId}
                  className="px-3 py-2 border-b border-cold-border/50 last:border-0"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StatusIcon className={`w-4 h-4 ${status.color}`} />
                      <span className="text-sm font-mono text-cold-accent">{merge.waybillId}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded border ${status.bg} ${status.color} ${status.border}`}
                      >
                        {hasWaybill ? '已生成' : status.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
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
                              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] ${
                                has ? cfg.bg + ' ' + cfg.color : 'bg-gray-800 text-gray-600 line-through'
                              }`}
                            >
                              <Icon className="w-2.5 h-2.5" />
                              {typeShortLabel[t]}
                            </span>
                          );
                        })}
                      </div>
                      {!hasWaybill &&
                        merge.status === 'incomplete' &&
                        merge.hasTemperature &&
                        merge.hasGps && (
                          <button
                            onClick={() => handleBuildWaybill(merge.waybillId)}
                            className="text-xs text-cold-accent hover:text-cold-light flex items-center gap-1 transition-colors"
                          >
                            <Package className="w-3 h-3" />
                            生成
                          </button>
                        )}
                      {hasWaybill && (
                        <button
                          onClick={() => handleGoToPlayback(merge.waybillId)}
                          className="text-xs text-cold-accent hover:text-cold-light flex items-center gap-1 transition-colors"
                        >
                          <Play className="w-3 h-3" />
                          回放
                        </button>
                      )}
                    </div>
                  </div>
                  {merge.missingTypes.length > 0 && (
                    <p className="text-xs text-warning-amber/80 mt-1 ml-6">
                      缺少: {merge.missingTypes.map((t) => typeShortLabel[t]).join('、')}
                      文件，补充后可生成运单
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {validationIssues.length > 0 && (
        <div className="bg-cold-surface/40 rounded-lg border border-cold-border overflow-hidden">
          <div className="px-3 py-2 border-b border-cold-border flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-300">数据校验</span>
            <div className="flex items-center gap-2 text-xs">
              {errorIssues.length > 0 && (
                <span className="text-alert-red">{errorIssues.length} 错误</span>
              )}
              {warningIssues.length > 0 && (
                <span className="text-warning-amber">{warningIssues.length} 警告</span>
              )}
              {errorIssues.length === 0 && warningIssues.length === 0 && (
                <span className="text-normal-green flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  全部通过
                </span>
              )}
            </div>
          </div>
          <div className="max-h-36 overflow-y-auto">
            {validationIssues.map((issue) => (
              <div
                key={issue.id}
                className={`px-3 py-2 border-b border-cold-border/50 last:border-0 ${
                  issue.severity === 'error' ? 'bg-alert-red/5' : 'bg-warning-amber/5'
                }`}
              >
                <div className="flex items-start gap-2">
                  {issue.severity === 'error' ? (
                    <AlertCircle className="w-3.5 h-3.5 text-alert-red mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-warning-amber mt-0.5 flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-200">{issue.message}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{issue.detail}</p>
                    <span className="text-xs text-gray-600 font-mono">{issue.waybillId}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {importedFiles.length > 0 && (
        <div className="bg-cold-surface/40 rounded-lg border border-cold-border overflow-hidden">
          <div className="px-3 py-2 border-b border-cold-border flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-300">
              文件列表 ({importedFiles.length})
            </span>
          </div>
          <div className="max-h-32 overflow-y-auto">
            {importedFiles
              .slice()
              .reverse()
              .map((file) => {
                const config = fileTypeConfig[file.type];
                const Icon = config.icon;
                return (
                  <div
                    key={file.id}
                    className="px-3 py-1.5 border-b border-cold-border/50 last:border-0 flex items-center justify-between hover:bg-cold-surface/50 transition-colors"
                  >
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
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {file.waybillId && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-normal-green/10 text-normal-green font-mono">
                          {file.waybillId}
                        </span>
                      )}
                      <button
                        onClick={() => removeImportedFile(file.id)}
                        className="text-gray-600 hover:text-alert-red transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
