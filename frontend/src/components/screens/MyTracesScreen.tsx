/**
 * MyTracesScreen - 我的轨迹列表
 *
 * 从原 TraceJourneyScreens.tsx 拆分而来。
 * 功能：展示用户创建的所有轨迹列表，支持按状态（全部/已跑/未完成/收藏）筛选。
 * 包含浮动新建按钮和底部导航栏。
 *
 * @source 拆分自 components/TraceJourneyScreens.tsx (SCREEN 15)
 */
import { useState, useEffect } from 'react';
import { miniToast } from '../../utils';
import { ArrowLeft, Search, MoreVertical, Plus, Lock } from 'lucide-react';
import { ScreenId } from '../../types';
import { BottomNavBar } from '../common/BottomNavBar';
import { useI18n } from '../../i18n';
import { listUserRuns } from '../../api/routes';
import {
  type TraceListItem,
  toTraceListItem,
  routeIcon,
  SELECTED_ROUTE_ID_KEY,
} from './trace-journey-utils';

export function MyTracesScreen({
  onNavigate,
  activeNavbarTab,
  setActiveNavbarTab,
}: {
  onNavigate: (screen: ScreenId) => void;
  activeNavbarTab: 'home' | 'traces' | 'profile';
  setActiveNavbarTab: (tab: 'home' | 'traces' | 'profile') => void;
}) {
  const { text } = useI18n();
  const [activeTab, setActiveTab] = useState<'all' | 'run' | 'unrun' | 'fav'>('all');
  const [items, setItems] = useState<TraceListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthError, setIsAuthError] = useState(false);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setIsAuthError(false);
    listUserRuns({ limit: 100 })
      .then(({ runs }) => {
        if (!mounted) return;
        setItems(runs.map(toTraceListItem));
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        setItems([]);
        const message = err instanceof Error ? err.message : '';
        if (message === 'auth_required' || message === 'user not authenticated') {
          setIsAuthError(true);
        } else {
          miniToast(text('轨迹数据加载失败', 'Failed to load traces'));
        }
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [text]);

  const filtered = items.filter(item => {
    if (activeTab === 'run') return item.status === 'completed';
    if (activeTab === 'unrun') return item.status === 'unrun';
    if (activeTab === 'fav') return item.isFavorite;
    return true;
  });

  return (
    <div className="w-full h-full bg-[#FFFFFF] flex flex-col justify-between text-slate-800 animate-fadeIn">
      {/* Top Header */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-gray-100">
        <button onClick={() => onNavigate('home')} className="p-1 hover:bg-neutral-100 rounded-full">
          <ArrowLeft size={20} className="text-slate-700" />
        </button>
        <span className="text-[16px] font-bold text-slate-900">{text('我的轨迹', 'My Traces')}</span>
        <div className="flex space-x-1.5">
          <button onClick={() => onNavigate('search')} className="p-1 hover:bg-neutral-100 rounded-full">
            <Search size={18} className="text-slate-600" />
          </button>
          <button onClick={() => miniToast(text('打开菜单', 'Open menu'))} className="p-1 hover:bg-neutral-100 rounded-full">
            <MoreVertical size={18} className="text-slate-600" />
          </button>
        </div>
      </div>

      {/* Horizontal pill categories */}
      <div className="px-4 py-3 flex space-x-2 overflow-x-auto scrollbar-none shrink-0">
        <button 
          onClick={() => setActiveTab('all')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${activeTab === 'all' ? 'bg-linear-to-r from-[#4FACFE] to-[#00F2FE] text-white shadow-sm shadow-cyan-400/20' : 'bg-slate-50 border border-slate-100 text-slate-600 hover:bg-slate-100'}`}
        >
          {text('全部', 'All')}
        </button>
        <button 
          onClick={() => setActiveTab('run')}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${activeTab === 'run' ? 'bg-linear-to-r from-[#4FACFE] to-[#00F2FE] text-white' : 'bg-slate-50 border border-slate-100 text-slate-600'}`}
        >
          {text('已跑', 'Completed')}
        </button>
        <button 
          onClick={() => setActiveTab('unrun')}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${activeTab === 'unrun' ? 'bg-linear-to-r from-[#4FACFE] to-[#00F2FE] text-white' : 'bg-slate-50 border border-slate-100 text-slate-600'}`}
        >
          {text('未完成', 'Unfinished')}
        </button>
        <button 
          onClick={() => setActiveTab('fav')}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${activeTab === 'fav' ? 'bg-linear-to-r from-[#4FACFE] to-[#00F2FE] text-white' : 'bg-slate-50 border border-slate-100 text-slate-600'}`}
        >
            {text('收藏', 'Favorites')}
        </button>
      </div>

      {/* Trace items lists scrollable */}
      <div className="flex-1 overflow-y-auto px-4 pb-[calc(96px+env(safe-area-inset-bottom))] space-y-3">
        {isLoading ? (
          <div className="py-20 text-center text-slate-400 space-y-2">
            <p className="text-sm">{text('正在加载轨迹数据...', 'Loading trace data...')}</p>
          </div>
        ) : isAuthError ? (
          <div className="py-20 text-center text-slate-400 space-y-3">
            <div className="w-14 h-14 mx-auto rounded-full bg-slate-50 flex items-center justify-center">
              <Lock size={24} className="text-slate-300" />
            </div>
            <p className="text-sm font-semibold text-slate-500">{text('请先登录后查看我的轨迹', 'Please log in to view your traces')}</p>
            <button
              onClick={() => onNavigate('login')}
              className="mx-auto mt-2 px-6 py-2 bg-linear-to-r from-[#4FACFE] to-[#00F2FE] text-white text-xs font-bold rounded-full shadow-sm active:scale-95 transition-transform"
            >
              {text('去登录', 'Log in')}
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-slate-400 space-y-2">
            <p className="text-sm">{text('暂无我的轨迹内容', 'No trace content yet')}</p>
            <p className="text-xs text-slate-300">{text('下拉刷新，查看历史记录和统计数据', 'Pull to refresh and view history and stats')}</p>
          </div>
        ) : (
          filtered.map(item => (
            <div 
              key={item.id}
              onClick={() => {
                localStorage.setItem(SELECTED_ROUTE_ID_KEY, item.id);
                onNavigate('trace_detail');
              }}
              className="bg-white p-3 rounded-[16px] border border-slate-100 shadow-[0_4px_12px_rgba(0,0,0,0.04)] hover:shadow-md transition-all active:scale-[0.99] flex items-center justify-between cursor-pointer group"
            >
              {/* Thumbnail left */}
              <div className="flex items-center space-x-3">
                <div className="w-[60px] h-[60px] rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100/60 overflow-hidden">
                  {routeIcon(item.route)}
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-slate-900 group-hover:text-cyan-600 transition-colors">{text(item.title, item.titleEn)}</h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-[12px] text-slate-500 font-medium">{item.distance}</span>
                    <span className="text-[10px] text-slate-400">{text('距', 'Dst')}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{item.date}</span>
                  </div>
                </div>
              </div>

              {/* Status flag right */}
              <div className="flex flex-col items-end space-y-1">
                {item.status === 'unrun' ? (
                  <span className="px-2 py-0.5 rounded text-[10px] bg-amber-50 text-amber-600 font-semibold border border-amber-200">{text('未完成', 'Unfinished')}</span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-600 font-semibold border border-emerald-200">{text('已完成', 'Completed')}</span>
                )}
                    <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    miniToast(text(`查看 ${item.title}`, `View ${item.titleEn}`));
                  }}
                  className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded"
                >
                  <MoreVertical size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Floating Action Button */}
      <button 
        onClick={() => onNavigate('editor')}
        className="absolute bottom-16 right-5 w-14 h-14 bg-gradient-to-r from-[#4FACFE] to-[#00F2FE] hover:brightness-105 rounded-full flex items-center justify-center text-white shadow-lg shadow-cyan-400/30 active:scale-95 transition-all z-20"
      >
        <Plus size={24} />
      </button>

      {/* Simple Simulated Bottom Navigation Bar */}
            <BottomNavBar
        onNavigate={onNavigate}
        activeNavbarTab={activeNavbarTab}
        setActiveNavbarTab={setActiveNavbarTab}
        iconSize={20}
        labelClassName="text-[10px] font-medium mt-1"
      />

    </div>
  );
}
