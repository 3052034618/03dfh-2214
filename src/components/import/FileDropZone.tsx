import { useState, useCallback } from 'react';
import { Upload, FileText, MapPin, Clock, CheckCircle, X } from 'lucide-react';
import type { ImportedFile } from '@/types';
import { useWaybillStore } from '@/store/useWaybillStore';

const fileTypeConfig = {
  temperature: { icon: FileText, label: '温度记录', color: 'text-temp-cold', bg: 'bg-temp-cold/10' },
  gps: { icon: MapPin, label: 'GPS轨迹', color: 'text-cold-accent', bg: 'bg-cold-accent/10' },
  loading: { icon: Clock, label: '装卸记录', color: 'text-warning-amber', bg: 'bg-warning-amber/10' },
  unknown: { icon: FileText, label: '未知文件', color: 'text-gray-400', bg: 'bg-gray-400/10' },
};

interface FileDropZoneProps {
  onFilesImported?: () => void;
}

export default function FileDropZone({ onFilesImported }: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const importedFiles = useWaybillStore((state) => state.importedFiles);
  const addImportedFile = useWaybillStore((state) => state.addImportedFile);

  const detectFileType = (filename: string): ImportedFile['type'] => {
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
          const newFile: ImportedFile = {
            id: `file_${Date.now()}_${index}`,
            name: file.name,
            type: detectFileType(file.name),
            size: file.size,
            uploadTime: new Date().toISOString().replace('T', ' ').substring(0, 19),
          };
          addImportedFile(newFile);
        }, index * 200);
      });

      onFilesImported?.();
    },
    [addImportedFile, onFilesImported]
  );

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const tempCount = importedFiles.filter((f) => f.type === 'temperature').length;
  const gpsCount = importedFiles.filter((f) => f.type === 'gps').length;
  const loadingCount = importedFiles.filter((f) => f.type === 'loading').length;

  return (
    <div className="space-y-4">
      {/* 拖拽区域 */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300
          ${isDragging
            ? 'drop-zone-active border-cold-accent'
            : 'border-cold-border hover:border-cold-light/50 bg-cold-surface/30'
          }
        `}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className={`
            w-16 h-16 rounded-full flex items-center justify-center transition-all
            ${isDragging ? 'bg-cold-accent/20 scale-110' : 'bg-cold-surface'}
          `}
          >
            <Upload className={`w-8 h-8 ${isDragging ? 'text-cold-accent' : 'text-gray-400'}`} />
          </div>
          <div>
            <p className="text-base font-medium text-gray-200">
              拖拽文件到此处或点击选择
            </p>
            <p className="text-sm text-gray-500 mt-1">
              支持温度记录（.csv/.txt）、GPS轨迹（.gpx/.csv）、装卸记录（.csv）
            </p>
          </div>
          <button className="mt-2 px-4 py-2 bg-cold-mid hover:bg-cold-light text-white text-sm rounded transition-colors">
            选择文件
          </button>
        </div>
      </div>

      {/* 已导入文件统计 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-cold-surface/50 rounded-lg p-3 border border-cold-border">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-temp-cold" />
            <span className="text-sm text-gray-400">温度记录</span>
          </div>
          <p className="text-2xl font-bold text-white font-mono mt-1">{tempCount}</p>
        </div>
        <div className="bg-cold-surface/50 rounded-lg p-3 border border-cold-border">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-cold-accent" />
            <span className="text-sm text-gray-400">GPS轨迹</span>
          </div>
          <p className="text-2xl font-bold text-white font-mono mt-1">{gpsCount}</p>
        </div>
        <div className="bg-cold-surface/50 rounded-lg p-3 border border-cold-border">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-warning-amber" />
            <span className="text-sm text-gray-400">装卸记录</span>
          </div>
          <p className="text-2xl font-bold text-white font-mono mt-1">{loadingCount}</p>
        </div>
      </div>

      {/* 已导入文件列表 */}
      {importedFiles.length > 0 && (
        <div className="bg-cold-surface/40 rounded-lg border border-cold-border overflow-hidden">
          <div className="px-4 py-2 border-b border-cold-border flex items-center justify-between">
            <span className="text-sm font-medium text-gray-300">
              已导入文件 ({importedFiles.length})
            </span>
            <span className="text-xs text-normal-green flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              已自动合并 {tempCount > 0 && gpsCount > 0 ? Math.min(tempCount, gpsCount) : 0} 个运单
            </span>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {importedFiles.slice().reverse().map((file) => {
              const config = fileTypeConfig[file.type];
              const Icon = config.icon;
              return (
                <div
                  key={file.id}
                  className="px-4 py-2 border-b border-cold-border/50 last:border-0 flex items-center justify-between hover:bg-cold-surface/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded flex items-center justify-center ${config.bg}`}>
                      <Icon className={`w-4 h-4 ${config.color}`} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-200 font-medium">{file.name}</p>
                      <p className="text-xs text-gray-500">
                        {config.label} · {formatSize(file.size)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {file.waybillId && (
                      <span className="text-xs px-2 py-0.5 rounded bg-normal-green/10 text-normal-green">
                        已匹配
                      </span>
                    )}
                    <button className="text-gray-500 hover:text-alert-red transition-colors">
                      <X className="w-4 h-4" />
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
