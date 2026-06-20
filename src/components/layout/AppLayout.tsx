import { useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Package, Play, FileBarChart, Thermometer, Snowflake } from 'lucide-react';
import { useWaybillStore } from '@/store/useWaybillStore';

type TabType = 'import' | 'playback' | 'report';

const tabs = [
  { id: 'import' as TabType, label: '导入运单', icon: Package, description: '文件导入与运单管理', path: '/import' },
  { id: 'playback' as TabType, label: '异常回放', icon: Play, description: '路线温漂同步回放', path: '/playback' },
  { id: 'report' as TabType, label: '质控报告', icon: FileBarChart, description: '温漂清单与打印', path: '/report' },
];

export default function AppLayout() {
  const location = useLocation();
  const loadMockData = useWaybillStore((state) => state.loadMockData);
  const waybills = useWaybillStore((state) => state.waybills);

  useEffect(() => {
    loadMockData();
  }, [loadMockData]);

  const currentTab = location.pathname.replace('/', '') || 'import';

  const alertCount = waybills.filter((w) => w.status === 'alert' || w.status === 'warning').length;
  const normalCount = waybills.filter((w) => w.status === 'normal').length;

  return (
    <div className="min-h-screen flex flex-col">
      {/* 顶部标题栏 */}
      <header className="no-print bg-cold-surface/80 backdrop-blur-sm border-b border-cold-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Snowflake className="w-8 h-8 text-cold-accent" />
            <Thermometer className="w-4 h-4 text-alert-red absolute -bottom-1 -right-1" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide">
              冷链质控 · 路线温漂复盘系统
            </h1>
            <p className="text-xs text-gray-400">Cold Chain Temperature Drift Review System</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-normal-green animate-pulse"></span>
            质控主管
          </span>
          <span className="text-gray-500">|</span>
          <span>{new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</span>
        </div>
      </header>

      {/* 标签页导航 */}
      <nav className="no-print bg-cold-bg/50 border-b border-cold-border">
        <div className="flex px-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <Link
                key={tab.id}
                to={tab.path}
                className={`
                  relative px-6 py-4 flex items-center gap-3 transition-all duration-200
                  ${isActive
                    ? 'text-cold-accent'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-cold-surface/30'
                  }
                `}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-cold-accent' : ''}`} />
                <div className="text-left">
                  <div className={`font-semibold text-sm ${isActive ? 'text-white' : ''}`}>
                    {tab.label}
                  </div>
                  <div className="text-xs opacity-70">{tab.description}</div>
                </div>
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cold-accent rounded-t"></span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* 主内容区 */}
      <main className="flex-1 overflow-auto">
        <div key={currentTab} className="animate-fade-in">
          <Outlet />
        </div>
      </main>

      {/* 底部状态栏 */}
      <footer className="no-print bg-cold-surface/60 border-t border-cold-border px-6 py-2 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <span>运单总数: <span className="text-cold-accent font-mono">{waybills.length}</span></span>
          <span>异常运单: <span className="text-alert-red font-mono">{alertCount}</span></span>
          <span>正常运单: <span className="text-normal-green font-mono">{normalCount}</span></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-normal-green animate-pulse"></span>
          系统运行正常
        </div>
      </footer>
    </div>
  );
}
