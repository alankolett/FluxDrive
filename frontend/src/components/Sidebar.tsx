import React from 'react';
import {
  LayoutDashboard,
  RefreshCw,
  FolderLock,
  Activity,
  Sparkles,
  ShieldCheck,
  FileCheck2,
  Lock,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export type NavView =
  | 'dashboard'
  | 'converter'
  | 'vault'
  | 'activity'
  | 'copilot'
  | 'scanner'
  | 'passport'
  | 'privacy_center'
  | 'settings';

interface SidebarProps {
  currentView: NavView;
  onSelectView: (view: NavView) => void;
  vaultCount: number;
  backendHealthy: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  vaultCount,
  backendHealthy,
  collapsed,
  onToggleCollapse,
}) => {
  const navItem = (id: NavView, label: string, icon: React.ReactNode, countBadge?: number) => {
    const isActive = currentView === id;
    return (
      <button
        onClick={() => onSelectView(id)}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded text-[13px] font-medium transition-colors text-left relative group ${
          isActive
            ? 'bg-blue-50/80 text-slate-900 font-semibold'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
        }`}
        title={collapsed ? label : undefined}
      >
        {/* Thin 2px blue vertical marker on left */}
        {isActive && (
          <span className="absolute left-0 top-1 bottom-1 w-[2px] bg-blue-600 rounded-r" />
        )}

        <span className={`shrink-0 transition-colors ${isActive ? 'text-blue-600' : 'text-slate-500 group-hover:text-slate-800'}`}>
          {icon}
        </span>
        {!collapsed && <span className="flex-1 truncate tracking-tight">{label}</span>}
        {!collapsed && countBadge !== undefined && countBadge > 0 && (
          <span className="text-[11px] font-mono font-medium px-1.5 py-0.2 rounded bg-slate-200/80 text-slate-700">
            {countBadge}
          </span>
        )}
      </button>
    );
  };

  return (
    <aside
      className={`h-screen bg-[#F9FAFB] border-r border-slate-200 text-slate-800 flex flex-col transition-all duration-150 select-none z-30 shrink-0 ${
        collapsed ? 'w-16' : 'w-[230px]'
      }`}
    >
      {/* 1. TOP BRAND AREA (~64px) */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200">
        {!collapsed ? (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-slate-900 flex items-center justify-center text-white text-xs font-black shadow-xs">
              F
            </div>
            <div className="leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-xs tracking-wider text-slate-900 uppercase">
                  FLUXDRIVE
                </span>
                <span className="text-[10px] font-mono font-medium text-slate-400">
                  v2.4
                </span>
              </div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
                SECURE WORKSPACE
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-auto w-7 h-7 rounded bg-slate-900 flex items-center justify-center text-white text-xs font-black">
            F
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          aria-label="Toggle sidebar"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* 2. NAVIGATION GROUPS */}
      <div className="flex-1 overflow-y-auto px-2 py-4 space-y-4">
        {/* WORKSPACE */}
        <div className="space-y-0.5">
          {!collapsed && (
            <div className="px-3 pb-1 text-[11px] font-bold text-slate-400 tracking-wider uppercase">
              WORKSPACE
            </div>
          )}
          {navItem('dashboard', 'Overview', <LayoutDashboard className="w-4 h-4" />)}
          {navItem('converter', 'Convert', <RefreshCw className="w-4 h-4" />)}
          {navItem('vault', 'Vault', <FolderLock className="w-4 h-4" />, vaultCount)}
          {navItem('activity', 'Activity', <Activity className="w-4 h-4" />)}
        </div>

        {/* INTELLIGENCE */}
        <div className="space-y-0.5">
          {!collapsed && (
            <div className="px-3 pb-1 text-[11px] font-bold text-slate-400 tracking-wider uppercase">
              INTELLIGENCE
            </div>
          )}
          {navItem('copilot', 'AI Copilot', <Sparkles className="w-4 h-4 text-violet-600" />)}
          {navItem('scanner', 'Privacy Scanner', <ShieldCheck className="w-4 h-4 text-emerald-600" />)}
        </div>

        {/* SECURITY */}
        <div className="space-y-0.5">
          {!collapsed && (
            <div className="px-3 pb-1 text-[11px] font-bold text-slate-400 tracking-wider uppercase">
              SECURITY
            </div>
          )}
          {navItem('passport', 'Security Passport', <FileCheck2 className="w-4 h-4 text-amber-600" />)}
          {navItem('privacy_center', 'Privacy Center', <Lock className="w-4 h-4 text-sky-600" />)}
        </div>
      </div>

      {/* 3. SETTINGS & COMPACT SYSTEM STATUS FOOTER */}
      <div className="p-2 border-t border-slate-200 bg-slate-50/70 space-y-1">
        {navItem('settings', 'Settings', <Settings className="w-4 h-4" />)}

        {!collapsed && (
          <div className="px-3 py-2 border-t border-slate-200/80 leading-tight">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <span className={`w-2 h-2 rounded-full ${backendHealthy ? 'bg-emerald-600' : 'bg-red-500'}`} />
              <span className="text-[11px] uppercase tracking-wider">{backendHealthy ? 'ENGINE ONLINE' : 'SYSTEM OFFLINE'}</span>
            </div>
            <div className="text-slate-500 text-[10px] mt-0.5">
              Private workspace active
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
