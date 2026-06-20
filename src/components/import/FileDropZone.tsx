import { useState, useCallback } from 'react';
import { Upload, FileText, MapPin, Clock, CheckCircle, X, AlertCircle, AlertTriangle, FileCheck } from 'lucide-react';
import type { ImportedFile, ImportedFileType } from '@/types';
import { useWaybillStore, extractWaybillId } from '@/store/useWaybillStore';

const fileTypeConfig: Record<ImportedFileType, { icon: typeof FileText; label: string; color: string; bg: string }> = {
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

export default function FileDropZone() {
  const [isDragging, setIsDragging] = useState(false);
  const importedFiles = useWaybillStore((state) => state.importedFiles);
  const mergeInfo = useWaybillStore((state) => state.mergeInfo);
  const validationIssues = useWaybillStore((state) => state.validationIssues);
  const addImportedFile = useWaybillStore((state) => state.addImportedFile);
  const removeImportedFile = useWaybillStore((state) => state.removeImportedFile);

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

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      files.forEach((file, index) => {
        setTimeout(() => {
          const detectedType = detectFileType(file.name);
          const waybillId = extractWaybillId(file.name) || undefined;
          const newFile: ImportedFile = {
            id: `file_${Date.now()}_${index}`,
            name: file.name,
            type: detectedType,
            size: file.size,
            uploadTime: new Date().toISOString().replace('T', ' ').substring(0, 19),
            waybillId,
          };
          addImportedFile(newFile);
        }, index * 100);
      });
    },
    [addImportedFile]
  );

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

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center transition-all duration-300
          ${isDragging
            ? 'drop-zone-active border-cold-accent'
            : 'border-cold-border hover:border-cold-light/50 bg-cold-surface/30'
          }
        `}
      >
        <div className="flex flex-col items-center gap-2">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isDragging ? 'bg-cold-accent/20 scale-110' : 'bg-cold-surface'}`}>
            <Upload className={`w-6 h-6 ${isDragging ? 'text-cold-accent' : 'text-gray-400'}`} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-200">拖拽文件到此处</p>
            <p className="text-xs text-gray-500 mt-0.5">温度记录 · GPS轨迹 · 装卸记录</p>
          </div>
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
              <span className="text-xs font-semibold text-gray-300">运单合并状态</span>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-normal-green">{completeCount} 已就绪</span>
                {incompleteCount > 0 && <span className="text-warning-amber">{incompleteCount} 待补</span>}
                {pendingCount > 0 && <span className="text-gray-500">{pendingCount} 缺失多</span>}
              </div>
            </div>
          </div>
          <div className="max-h-40 overflow-y-auto">
            {mergeInfo.map((merge) => {
              const allTypes: ImportedFileType[] = ['temperature', 'gps', 'loading'];
              const statusIcon = merge.status === 'complete'
                ? <CheckCircle className="w-4 h-4 text-normal-green" />
                : merge.status === 'incomplete'
                ? <AlertCircle className="w-4 h-4 text-warning-amber" />
                : <AlertTriangle className="w-4 h-4 text-gray-500" />;
              return (
                <div key={merge.waybillId} className="px-3 py-2 border-b border-cold-border/50 last:border-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {statusIcon}
                      <span className="text-sm font-mono text-cold-accent">{merge.waybillId}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {allTypes.map((t) => {
                        const has = t === 'temperature' ? merge.hasTemperature : t === 'gps' ? merge.hasGps : merge.hasLoading;
                        const cfg = fileTypeConfig[t];
                        const Icon = cfg.icon;
                        return (
                          <span
                            key={t}
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${has ? cfg.bg + ' ' + cfg.color : 'bg-gray-800 text-gray-600 line-through'}`}
                          >
                            <Icon className="w-3 h-3" />
                            {typeShortLabel[t]}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  {merge.missingTypes.length > 0 && (
                    <p className="text-xs text-warning-amber/80 mt-1 ml-6">
                      缺少: {merge.missingTypes.map((t) => typeShortLabel[t]).join('、')}文件，补充后可生成运单
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
              {errorIssues.length > 0 && <span className="text-alert-red">{errorIssues.length} 错误</span>}
              {warningIssues.length > 0 && <span className="text-warning-amber">{warningIssues.length} 警告</span>}
              {errorIssues.length === 0 && warningIssues.length === 0 && (
                <span className="text-normal-green flex items-center gap-1"><CheckCircle className="w-3 h-3" />全部通过</span>
              )}
            </div>
          </div>
          <div className="max-h-36 overflow-y-auto">
            {validationIssues.map((issue) => (
              <div key={issue.id} className={`px-3 py-2 border-b border-cold-border/50 last:border-0 ${issue.severity === 'error' ? 'bg-alert-red/5' : 'bg-warning-amber/5'}`}>
                <div className="flex items-start gap-2">
                  {issue.severity === 'error'
                    ? <AlertCircle className="w-3.5 h-3.5 text-alert-red mt-0.5 flex-shrink-0" />
                    : <AlertTriangle className="w-3.5 h-3.5 text-warning-amber mt-0.5 flex-shrink-0" />
                  }
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
            <span className="text-xs font-semibold text-gray-300">文件列表 ({importedFiles.length})</span>
          </div>
          <div className="max-h-32 overflow-y-auto">
            {importedFiles.slice().reverse().map((file) => {
              const config = fileTypeConfig[file.type];
              const Icon = config.icon;
              return (
                <div key={file.id} className="px-3 py-1.5 border-b border-cold-border/50 last:border-0 flex items-center justify-between hover:bg-cold-surface/50 transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${config.bg}`}>
                      <Icon className={`w-3 h-3 ${config.color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-200 truncate">{file.name}</p>
                      <p className="text-[10px] text-gray-500">{config.label} · {formatSize(file.size)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {file.waybillId && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-normal-green/10 text-normal-green font-mono">{file.waybillId}</span>
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
