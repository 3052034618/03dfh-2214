import FileDropZone from '@/components/import/FileDropZone';
import WaybillTable from '@/components/import/WaybillTable';
import Timeline from '@/components/import/Timeline';
import { useWaybillStore } from '@/store/useWaybillStore';
import { useNavigate } from 'react-router-dom';
import { Play } from 'lucide-react';

export default function ImportPage() {
  const selectedWaybillId = useWaybillStore((state) => state.selectedWaybillId);
  const navigate = useNavigate();

  const handleGoToPlayback = () => {
    if (selectedWaybillId) {
      navigate('/playback');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-12 gap-6">
        {/* 左侧 - 文件导入区 */}
        <div className="col-span-4">
          <FileDropZone />
        </div>

        {/* 右侧 - 运单概览 */}
        <div className="col-span-8 space-y-6">
          {/* 运单列表 */}
          <WaybillTable />

          {/* 关键节点时间轴 */}
          <Timeline />
        </div>
      </div>

      {/* 操作栏 */}
      {selectedWaybillId && (
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={handleGoToPlayback}
            className="
              inline-flex items-center gap-2 px-5 py-2.5 rounded
              bg-cold-accent hover:bg-cold-light text-white font-medium text-sm
              transition-all duration-200 hover:shadow-lg hover:shadow-cold-accent/30
            "
          >
            <Play className="w-4 h-4" />
            查看异常回放
          </button>
        </div>
      )}
    </div>
  );
}
