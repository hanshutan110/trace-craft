import { useState, useEffect } from 'react';
import { miniToast } from '../utils';
import { 
  ArrowLeft, 
  Search, 
  MoreVertical, 
  Plus, 
  Edit, 
  Play, 
  Share2, 
  Download, 
  Heart, 
  Trash2, 
  Calendar, 
  Filter, 
  ChevronRight,
  Maximize2,
  TrendingUp,
  Activity,
  Route,
  Timer,
  Lock
} from 'lucide-react';
import { ScreenId } from '../types';
import { BottomNavBar } from './common/BottomNavBar';
import { useI18n } from '../i18n';
import type { GeneratedRoute } from '../types';
import { getRoute, listUserRuns } from '../api/routes';
import { getRunHistory, type RunHistoryEntry } from '../api/user';

const SELECTED_ROUTE_ID_KEY = 'tracecraft_selected_route_id';
const SELECTED_RUN_SESSION_ID_KEY = 'tracecraft_selected_run_session_id';

interface TraceListItem {
  id: string;
  title: string;
  titleEn: string;
  distance: string;
  date: string;
  status: 'completed' | 'unrun';
  isFavorite: boolean;
  route: GeneratedRoute;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '--';
  return value.slice(0, 10);
}

function formatKm(valueM: number | null | undefined): string {
  const km = Number(valueM || 0) / 1000;
  return `${km.toFixed(km >= 10 ? 1 : 2)}km`;
}

function formatDuration(seconds: number | null | undefined): string {
  const total = Math.max(0, Math.round(Number(seconds || 0)));
  const minutes = Math.floor(total / 60);
  const sec = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function routeTitle(route: GeneratedRoute | null | undefined): { title: string; titleEn: string } {
  if (!route) return { title: '未命名轨迹', titleEn: 'Untitled Route' };
  if (route.shapeType) {
    const labels: Record<string, [string, string]> = {
      circle: ['圆形路线', 'Circle Route'],
      triangle: ['三角路线', 'Triangle Route'],
      square: ['方形路线', 'Square Route'],
      star: ['星形路线', 'Star Route'],
      heart: ['爱心路线', 'Heart Route'],
      hexagon: ['六边形路线', 'Hexagon Route'],
      custom: ['图片路线', 'Image Route'],
    };
    const [title, titleEn] = labels[route.shapeType] || ['创意路线', 'Creative Route'];
    return { title, titleEn };
  }
  const filename = route.source?.filename;
  return {
    title: filename ? `${filename} 路线` : '图片路线',
    titleEn: filename ? `${filename} Route` : 'Image Route',
  };
}

function routeIcon(route: GeneratedRoute | null | undefined, className: string = 'w-10 h-10 text-cyan-500') {
  const shape = route?.shapeType || 'custom';
  if (shape === 'heart') {
    return <svg className={className.replace('text-cyan-500', 'text-rose-500')} viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="4"><path d="M 50,75 C 10,40 25,10 50,35 C 75,10 90,40 50,75 Z" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  }
  if (shape === 'star') {
    return <svg className={className.replace('text-cyan-500', 'text-yellow-500')} viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="4"><path d="M 50,15 L 61,38 L 86,41 L 67,58 L 72,83 L 50,70 L 28,83 L 33,58 L 14,41 L 39,38 Z" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  }
  if (shape === 'circle') {
    return <svg className={className} viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="4"><circle cx="50" cy="50" r="32" /></svg>;
  }
  return <svg className={className.replace('text-cyan-500', 'text-orange-500')} viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="4"><path d="M 20,80 Q 25,40 35,40 Q 40,25 50,40 Q 60,25 65,40 Q 75,40 80,80 Q 50,85 20,80" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function toTraceListItem(route: GeneratedRoute): TraceListItem {
  const title = routeTitle(route);
  return {
    id: route.id,
    ...title,
    distance: formatKm(route.actualDistanceM || route.meta?.distanceM),
    date: formatDate(route.updatedAt || route.createdAt),
    status: route.status === 'finished' || route.status === 'completed' ? 'completed' : 'unrun',
    isFavorite: Boolean(route.isFavorite),
    route,
  };
}

function toHistoryRecord(entry: RunHistoryEntry) {
  const title = routeTitle(entry.route);
  const durationSec = Number(entry.metrics?.timeSec || 0);
  const distanceM = Number(entry.metrics?.actualDistanceM || entry.metrics?.plannedDistanceM || entry.route?.actualDistanceM || 0);
  const paceSec = distanceM > 0 ? durationSec / (distanceM / 1000) : 0;
  const pace = paceSec > 0 ? `${Math.floor(paceSec / 60)}:${String(Math.round(paceSec % 60)).padStart(2, '0')}/km` : '--/km';
  return {
    id: entry.sessionId,
    ...title,
    date: formatDate(entry.finishedAt || entry.startedAt || entry.createdAt),
    dist: formatKm(distanceM),
    duration: formatDuration(durationSec),
    pace,
    accuracy: Math.round(Number(entry.metrics?.completionRate || entry.route?.shapeSimilarityScore || 0)),
    svg: routeIcon(entry.route),
    entry,
  };
}

// ----------------------------------------------------------------------
// SCREEN 14: Splash Screen (启动页)
// ----------------------------------------------------------------------
export function SplashScreen({ onNavigate }: { onNavigate: (screen: ScreenId) => void }) {
  const { text } = useI18n();
  const [loadingStep, setLoadingStep] = useState(0);
  const featureItems = [
    {
      icon: Route,
      title: text('实时轨迹', 'Live route'),
      desc: text('边跑边校准方向', 'Adjust direction while running'),
      tone: 'text-cyan-600 bg-cyan-50 border-cyan-100',
    },
    {
      icon: Activity,
      title: text('运动数据', 'Run metrics'),
      desc: text('距离、时间、配速清晰记录', 'Distance, time, pace tracked clearly'),
      tone: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    },
    {
      icon: Timer,
      title: text('路线回顾', 'Route replay'),
      desc: text('复盘每一次轨迹表现', 'Review every route performance'),
      tone: 'text-amber-600 bg-amber-50 border-amber-100',
    },
  ];

  useEffect(() => {
    const intervalId = setInterval(() => {
      setLoadingStep(s => (s + 1) % 4);
    }, 500);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      onNavigate('login');
    }, 3000);
    return () => clearTimeout(timer);
  }, [onNavigate]);

  return (
    <div 
      className="w-full max-w-full h-full bg-[#f8fbf7] flex flex-col text-slate-900 relative select-none animate-fadeIn cursor-pointer overflow-hidden"
      onClick={() => {
        miniToast(text('欢迎进入运动应用', 'Welcome to the fitness app'));
        onNavigate('home');
      }}
    >
      <div className="h-[42%] min-h-[330px] bg-linear-to-br from-[#38bdf8] via-[#16c7d8] to-[#09e5df] text-white relative flex flex-col items-center justify-center px-6 pb-7 overflow-hidden">
        <svg className="absolute inset-0 w-full h-full opacity-25" viewBox="0 0 430 390" fill="none" preserveAspectRatio="none" aria-hidden="true">
          <path d="M-20 302 C 65 230, 102 328, 166 247 S 274 139, 452 188" stroke="white" strokeWidth="2" strokeDasharray="8 14" strokeLinecap="round" />
          <path d="M-35 92 C 42 145, 101 77, 178 124 S 305 208, 466 76" stroke="white" strokeWidth="1.6" strokeDasharray="5 12" strokeLinecap="round" />
          <circle cx="75" cy="268" r="5" fill="white" />
          <circle cx="320" cy="158" r="4" fill="#f59e0b" />
        </svg>
        <div className="absolute inset-x-0 bottom-0 h-20 bg-linear-to-t from-[#f8fbf7] to-transparent opacity-30 pointer-events-none"></div>

        <div className="relative z-10 w-[92px] h-[92px] bg-white rounded-full flex items-center justify-center shadow-xl shadow-cyan-700/20 mb-6 active:scale-95 transition-transform">
          <svg className="w-14 h-14 text-cyan-500" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 10.2l-.3 1.5C6.4 13 8 14 9.5 14l1.3-.2-.5 2.5-3.8.8c-.3.1-.5.4-.5.7 0 .4.4.7.8.7l4.5-.9c.4-.1.7-.4.8-.8l.8-4.2c.1-.4-.1-.8-.5-.9l-3.3-1zM19.4 8.1c-.2-.4-.5-.6-1-.5l-3.9.7c-.4.1-.7.4-.8.8l-.8 4.2c0 .2.1.4.3.5.2.1.4.1.5-.1l.9-1.9 1.5 2.5c.2.3.5.5.9.5h2.5c.3 0 .5-.2.5-.5s-.2-.5-.5-.5H17.4l-1.3-2.1 1.7-2.1 1.6.4c.1 0 .2 0 .3-.1l1.5-1.1c.2-.2.3-.5.1-.7l-.2-.2z" />
          </svg>
        </div>

        <h1 className="relative z-10 text-[29px] font-black tracking-tight drop-shadow-md">
          {text('轨迹运动', 'Trace Run')}
        </h1>
        <p className="relative z-10 text-[14px] text-white/85 font-semibold tracking-[0.08em] mt-2">
          {text('让每一次运动更清晰', 'Make every run clearer')}
        </p>

        <div className="relative z-10 flex items-center space-x-1.5 mt-8 h-4">
          <span className={`w-2.5 h-2.5 rounded-full bg-white transition-all duration-300 ${loadingStep === 0 ? 'scale-125 opacity-100' : 'scale-90 opacity-40'}`}></span>
          <span className={`w-2.5 h-2.5 rounded-full bg-white transition-all duration-300 ${loadingStep === 1 ? 'scale-125 opacity-100' : 'scale-90 opacity-40'}`}></span>
          <span className={`w-2.5 h-2.5 rounded-full bg-white transition-all duration-300 ${loadingStep === 2 ? 'scale-125 opacity-100' : 'scale-90 opacity-40'}`}></span>
        </div>
      </div>

      <div className="w-full max-w-full min-w-0 flex-1 min-h-0 overflow-x-hidden overflow-y-auto scrollbar-none flex flex-col justify-between px-5 pt-5 pb-[calc(20px+env(safe-area-inset-bottom))]">
        <div className="w-full max-w-[390px] mx-auto space-y-4 shrink-0">
          <div className="w-full max-w-full min-w-0 overflow-hidden rounded-[24px] bg-white border border-slate-100 shadow-[0_18px_42px_rgba(15,23,42,0.08)] p-4">
            <div className="flex items-center justify-between gap-3 mb-3 min-w-0">
              <div className="min-w-0">
                <p className="text-[11px] font-black text-cyan-600 tracking-[0.14em] uppercase">TraceCraft</p>
                <h2 className="text-[18px] font-black text-slate-950 mt-0.5 leading-tight">{text('今天的轨迹预览', 'Today route preview')}</h2>
              </div>
              <span className="shrink-0 px-2 py-1 rounded-full bg-amber-50 text-amber-700 text-[10px] font-extrabold border border-amber-100">
                {text('智能分析', 'Smart')}
              </span>
            </div>
            <div className="h-[92px] rounded-[18px] bg-[#eef9f7] border border-cyan-100/70 relative overflow-hidden">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(14,165,233,0.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(14,165,233,0.12)_1px,transparent_1px)] bg-[size:18px_18px]"></div>
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 330 92" fill="none" preserveAspectRatio="none" aria-hidden="true">
                <path d="M32 68 C 75 14, 110 82, 154 40 S 228 19, 297 58" stroke="#0891b2" strokeWidth="5" strokeLinecap="round" />
                <path d="M32 68 C 75 14, 110 82, 154 40 S 228 19, 297 58" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 12" />
                <circle cx="32" cy="68" r="7" fill="#10b981" stroke="white" strokeWidth="3" />
                <circle cx="297" cy="58" r="7" fill="#f59e0b" stroke="white" strokeWidth="3" />
              </svg>
            </div>
            <div className="grid grid-cols-3 divide-x divide-slate-100 pt-3 text-center">
              <div>
                <span className="text-[18px] font-black font-mono text-slate-950">3.2</span>
                <p className="text-[10px] font-semibold text-slate-500 mt-0.5">km</p>
              </div>
              <div>
                <span className="text-[18px] font-black font-mono text-slate-950">21:18</span>
                <p className="text-[10px] font-semibold text-slate-500 mt-0.5">{text('时间', 'Time')}</p>
              </div>
              <div>
                <span className="text-[18px] font-black font-mono text-slate-950">5'58"</span>
                <p className="text-[10px] font-semibold text-slate-500 mt-0.5">{text('配速', 'Pace')}</p>
              </div>
            </div>
          </div>

          <div className="w-full max-w-full min-w-0 grid grid-cols-3 gap-2 overflow-hidden">
            {featureItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="min-w-0 min-h-[92px] rounded-[18px] bg-white border border-slate-100 p-3 shadow-[0_10px_26px_rgba(15,23,42,0.04)] overflow-hidden">
                  <div className={`w-9 h-9 rounded-full border flex items-center justify-center ${item.tone}`}>
                    <Icon size={17} strokeWidth={2.4} aria-hidden="true" />
                  </div>
                  <h3 className="text-[12px] font-black text-slate-950 mt-2 leading-tight break-words">{item.title}</h3>
                  <p className="text-[9px] leading-snug text-slate-500 mt-1 break-words">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="w-full max-w-[390px] mx-auto space-y-3 pt-4 shrink-0">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onNavigate('home');
          }}
          className="w-full min-h-[48px] bg-slate-950 text-white font-black text-sm rounded-full shadow-lg shadow-[0_14px_30px_rgba(15,23,42,0.18)] hover:bg-slate-800 active:scale-[0.98] transition-all text-center tracking-[0.08em] block"
        >
          {text('继续开始体验', 'Continue')}
        </button>
        <p className="text-center text-[10px] text-slate-400 tracking-[0.08em]">
          {text('TrackCraft 2026 运动路线智能分析', 'TrackCraft 2026 intelligent route analysis')}
        </p>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
  // SCREEN 15: My Traces List (我的轨迹列表)
// ----------------------------------------------------------------------
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

// ----------------------------------------------------------------------
// SCREEN 16: Track Detail (轨迹详情)
// ----------------------------------------------------------------------
export function TraceDetailScreen({ onNavigate }: { onNavigate: (screen: ScreenId) => void }) {
  const { text } = useI18n();
  const [favorite, setFavorite] = useState(false);
  const [route, setRoute] = useState<GeneratedRoute | null>(null);

  useEffect(() => {
    const routeId = localStorage.getItem(SELECTED_ROUTE_ID_KEY);
    if (!routeId) return;
    getRoute(routeId)
      .then(setRoute)
      .catch(() => miniToast(text('轨迹详情加载失败', 'Failed to load trace detail')));
  }, [text]);

  const title = routeTitle(route);
  const routeDistance = route ? formatKm(route.actualDistanceM || route.meta?.distanceM) : '0.00km';
  const routeStatus = route?.status === 'finished' || route?.status === 'completed' ? 'completed' : 'unrun';

  return (
    <div className="w-full h-full bg-[#FFFFFF] flex flex-col justify-between overflow-y-auto text-slate-800 animate-fadeIn">
      {/* Top Header */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-gray-100 bg-white shrink-0">
        <button onClick={() => onNavigate('my_traces')} className="p-1 hover:bg-neutral-100 rounded-full">
          <ArrowLeft size={18} className="text-slate-700" />
        </button>
        <span className="text-[16px] font-bold text-slate-900">{text('轨迹详情', 'Trace Detail')}</span>
        <div className="flex space-x-1">
          <button onClick={() => { setFavorite(!favorite); miniToast(text(favorite ? '取消收藏' : '已添加收藏到模板', favorite ? 'Removed from favorites' : 'Added to templates')); }} className="p-1.5 hover:bg-neutral-100 rounded-full">
            <Heart size={16} fill={favorite ? 'red' : 'none'} className={favorite ? 'text-red-500' : 'text-slate-600'} />
          </button>
          <button onClick={() => miniToast(text('分享轨迹', 'Share route'))} className="p-1.5 hover:bg-neutral-100 rounded-full">
            <Share2 size={16} className="text-slate-600" />
          </button>
        </div>
      </div>

      {/* Main Content Areas */}
      <div className="flex-1 overflow-y-auto pb-4">
        {/* Map area */}
        <div className="h-[230px] bg-slate-50 border-b border-slate-100 relative overflow-hidden flex items-center justify-center">
          {/* Grid map background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#eef2f6_1px,transparent_1px),linear-gradient(to_bottom,#eef2f6_1px,transparent_1px)] bg-[size:20px_20px] opacity-60"></div>
          
          {/* Drawn cat-shape track line */}
          <div className="relative z-10">{routeIcon(route, 'w-48 h-48 text-cyan-500 drop-shadow-md')}</div>

          {/* Indicators overlay */}
          <div className="absolute top-2.5 left-2.5 bg-slate-900/80 text-white text-[9px] px-2 py-0.5 rounded-full border border-slate-800 z-20 font-bold select-none flex items-center space-x-1">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
            <span>{text('GPS 实时定位', 'Live GPS')}</span>
          </div>

          <button 
            onClick={() => miniToast(text('开启全屏查看', 'Open full screen'))}
            className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 shadow-md border border-neutral-100 flex items-center justify-center hover:bg-white active:scale-90 transition-all text-slate-700 z-20"
          >
            <Maximize2 size={13} />
          </button>
        </div>

        {/* Trace Information Card */}
        <div className="px-4 -mt-6 relative z-20">
          <div className="bg-white p-4 rounded-[24px] shadow-[0_8px_24px_rgba(0,0,0,0.06)] border border-slate-100/85">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span className="text-[20px] font-black text-slate-900">{text(title.title, title.titleEn)}</span>
                <span className="px-1.5 py-0.5 text-[9px] bg-orange-50 text-orange-600 font-bold rounded">
                  {routeStatus === 'completed' ? text('已完成', 'Completed') : text('未完成', 'Unfinished')}
                </span>
              </div>
              <button 
                onClick={() => onNavigate('editor')}
                className="w-8 h-8 bg-cyan-50 hover:bg-cyan-100 text-cyan-600 rounded-full flex items-center justify-center transition-all"
              >
                <Edit size={14} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-y-3 gap-x-2 pt-2 border-t border-slate-50 text-[13px] text-slate-600">
              <div className="flex items-center space-x-2">
                <span className="text-slate-400 font-bold">{text('长', 'D')}</span>
                <span>{text('总长度:', 'Distance:')}</span>
                <strong className="text-slate-900">{routeDistance}</strong>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-slate-400 font-bold">{text('耗', 'T')}</span>
                <span>{text('耗时:', 'Duration:')}</span>
                <strong className="text-slate-900">{route?.targetKm ? `${route.targetKm}km` : text('未开始', 'Not started')}</strong>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-slate-400 font-bold">{text('时', 'C')}</span>
                <span>{text('创建时间:', 'Created:')}</span>
                <span className="text-slate-900 font-mono">{formatDate(route?.createdAt)}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-slate-400 font-bold">{text('配', 'P')}</span>
                <span>{text('可跑分:', 'Runnable:')}</span>
                <span className="text-slate-900 font-mono">{Math.round(Number(route?.runnableScore || 0)) || '--'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Data statistics card */}
        <div className="px-4 mt-3">
          <div className="bg-white p-4 rounded-[24px] border border-slate-100 shadow-[0_4px_16px_rgba(0,0,0,0.03)]/80 flex items-center justify-between text-center select-none">
            <div className="flex-1 border-r border-slate-100">
              <p className="text-[10px] text-slate-400 font-medium">{text('卡路里', 'Calories')}</p>
              <p className="text-[16px] font-extrabold text-slate-900 mt-0.5">128</p>
            </div>
            <div className="flex-1 border-r border-slate-100">
              <p className="text-[10px] text-slate-400 font-medium">{text('高低变化', 'Elevation')}</p>
              <p className="text-[16px] font-extrabold text-slate-900 mt-0.5">1.0x</p>
            </div>
            <div className="flex-1">
              <p className="text-[10px] text-slate-400 font-medium">{text('平均配速', 'Avg pace')}</p>
              <p className="text-[16px] font-extrabold text-slate-900 mt-0.5">0.0 km/h</p>
            </div>
          </div>
        </div>

        {/* Two big buttons */}
        <div className="px-4 mt-5 grid grid-cols-2 gap-3.5">
          <button 
            onClick={() => onNavigate('editor')}
            className="py-3 px-4 border border-slate-200 text-slate-700 font-black text-sm rounded-[32px] flex items-center justify-center space-x-2 bg-white active:bg-neutral-50 active:scale-98 transition-all"
          >
            <Edit size={15} />
            <span>{text('编辑轨迹', 'Edit route')}</span>
          </button>
          <button 
            onClick={() => {
              miniToast(text('请先重新生成路线并确认风险', 'Regenerate and confirm route first'));
              onNavigate('quick_cards');
            }}
            className="py-3 px-4 bg-gradient-to-r from-[#4FACFE] to-[#00F2FE] hover:brightness-105 active:scale-98 transition-all text-white font-black text-sm rounded-[32px] flex items-center justify-center space-x-2 shadow-md shadow-cyan-400/20"
          >
            <Play size={15} className="fill-current" />
            <span>{text('开始导航', 'Start navigation')}</span>
          </button>
        </div>

        {/* Horizontal Action Bar icons */}
        <div className="px-6 py-4 mt-4 border-t border-slate-50 flex items-center justify-around select-none">
          <button 
            onClick={() => onNavigate('trace_share')}
            className="flex flex-col items-center space-y-1 group"
          >
            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-cyan-50 transition-colors text-slate-500 group-hover:text-cyan-600">
              <Share2 size={16} />
            </div>
            <span className="text-[10px] text-slate-500 font-medium leading-none">{text('分享', 'Share')}</span>
          </button>
          <button 
            onClick={() => miniToast(text('跑步卡片已生成，快去分享吧', 'Share card generated!'))}
            className="flex flex-col items-center space-y-1 group"
          >
            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-cyan-50 transition-colors text-slate-500 group-hover:text-cyan-600">
              <Download size={16} />
            </div>
            <span className="text-[10px] text-slate-500 font-medium leading-none">{text('分享卡片', 'Share Card')}</span>
          </button>
          <button 
            onClick={() => miniToast(text('已收藏该模板', 'Saved to templates'))}
            className="flex flex-col items-center space-y-1 group"
          >
            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-cyan-50 transition-colors text-slate-500 group-hover:text-cyan-600">
              <Heart size={16} />
            </div>
            <span className="text-[10px] text-slate-500 font-medium leading-none">{text('收藏', 'Save')}</span>
          </button>
          <button 
            onClick={() => {
              miniToast(text('已执行删除轨迹任务', 'Route deleted'));
              onNavigate('my_traces');
            }}
            className="flex flex-col items-center space-y-1 group"
          >
            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-red-50 transition-colors text-slate-500 group-hover:text-red-500">
              <Trash2 size={16} />
            </div>
            <span className="text-[10px] text-slate-500 font-medium leading-none">{text('删除', 'Delete')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
  // SCREEN 17: History Runner List (历史跑步记录)
// ----------------------------------------------------------------------
export function RunHistoryScreen({
  onNavigate,
  activeNavbarTab,
  setActiveNavbarTab,
}: {
  onNavigate: (screen: ScreenId) => void;
  activeNavbarTab: 'home' | 'traces' | 'profile';
  setActiveNavbarTab: (tab: 'home' | 'traces' | 'profile') => void;
}) {
  const { text } = useI18n();
  const [activeTab, setActiveTab] = useState<'all' | 'month' | 'week' | 'custom'>('all');
  const [history, setHistory] = useState<RunHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    getRunHistory()
      .then((items) => {
        if (mounted) setHistory(items);
      })
      .catch(() => {
        if (!mounted) return;
        setHistory([]);
        miniToast(text('历史记录加载失败', 'Failed to load run history'));
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [text]);

  const records = history.map(toHistoryRecord);
  const totalDistanceKm = records.reduce((sum, rec) => sum + Number(rec.dist.replace('km', '') || 0), 0);
  const totalMinutes = history.reduce((sum, item) => sum + Math.round(Number(item.metrics?.timeSec || 0) / 60), 0);

  return (
    <div className="w-full h-full bg-[#FFFFFF] flex flex-col justify-between text-slate-800 animate-fadeIn">
      {/* Top Header */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-gray-100 shrink-0 bg-white">
        <button onClick={() => onNavigate('profile')} className="p-1 hover:bg-neutral-100 rounded-full">
          <ArrowLeft size={18} className="text-slate-700" />
        </button>
        <span className="text-[16px] font-bold text-slate-900">{text('历史记录', 'History')}</span>
        <div className="flex space-x-1">
          <button onClick={() => miniToast(text('开启筛选条件', 'Open filters'))} className="p-1.5 hover:bg-neutral-100 rounded-full">
            <Filter size={16} className="text-slate-600" />
          </button>
          <button onClick={() => miniToast(text('选择日期范围', 'Pick date range'))} className="p-1.5 hover:bg-neutral-100 rounded-full">
            <Calendar size={16} className="text-slate-600" />
          </button>
        </div>
      </div>

      {/* Main stats summary top card */}
      <div className="px-4 pt-3 shrink-0">
        <div className="bg-slate-900 text-white rounded-[24px] p-4 shadow-md bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-755">
          <span className="text-[10px] text-teal-400 font-extrabold uppercase tracking-widest block mb-2">{text('RUNNING SUMMARY / 运动总结', 'RUNNING SUMMARY')}</span>
          <div className="grid grid-cols-3 gap-1 select-none">
            <div className="text-center border-r border-slate-800/80">
              <span className="text-[20px] font-black font-mono text-white">{records.length}</span>
              <p className="text-[9px] text-slate-400 mt-0.5">{text('里程 (km)', 'Distance (km)')}</p>
            </div>
            <div className="text-center border-r border-slate-800/80">
              <span className="text-[20px] font-black font-mono text-white">{totalDistanceKm.toFixed(1)}</span>
              <p className="text-[9px] text-slate-400 mt-0.5">{text('距离 (KM)', 'Distance (km)')}</p>
            </div>
            <div className="text-center">
              <span className="text-[20px] font-black font-mono text-white">{totalMinutes}</span>
              <p className="text-[9px] text-slate-400 mt-0.5">{text('时间 (分钟)', 'Time (min)')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 py-3 flex space-x-2 overflow-x-auto scrollbar-none shrink-0">
        {(['all', 'month', 'week', 'custom'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all ${
              activeTab === tab
                ? 'bg-linear-to-r from-[#4FACFE] to-[#00F2FE] text-white shadow-xs'
                : 'bg-slate-50 border border-slate-100 text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab === 'all' && text('全部', 'All')}
            {tab === 'month' && text('本月', 'Month')}
            {tab === 'week' && text('本周', 'Week')}
            {tab === 'custom' && text('自定义', 'Custom')}
          </button>
        ))}
      </div>

      {/* List content */}
      <div className="flex-1 overflow-y-auto px-4 pb-[calc(96px+env(safe-area-inset-bottom))] space-y-3">
        {isLoading ? (
          <div className="py-20 text-center text-slate-400 space-y-2">
            <p className="text-sm">{text('正在加载历史记录...', 'Loading history...')}</p>
          </div>
        ) : records.length === 0 ? (
          <div className="py-20 text-center text-slate-400 space-y-2">
            <p className="text-sm">{text('暂无跑步历史', 'No run history yet')}</p>
            <p className="text-xs text-slate-300">{text('完成一次导航后会自动写入数据库', 'Finish a navigation session to save history')}</p>
          </div>
        ) : records.map(rec => {
          const isExcellent = rec.accuracy >= 95;
          const isWarn = rec.accuracy < 95 && rec.accuracy >= 90;
          const accuracyColor = isExcellent ? 'text-emerald-500' : isWarn ? 'text-amber-500' : 'text-rose-500';

          return (
            <div
              key={rec.id}
              onClick={() => {
                localStorage.setItem(SELECTED_RUN_SESSION_ID_KEY, rec.id);
                onNavigate('run_detail');
              }}
              className="bg-white p-3.5 rounded-[16px] border border-slate-100 shadow-[0_4px_12px_rgba(0,0,0,0.03)] cursor-pointer flex items-center justify-between group active:scale-[0.99] transition-all"
            >
              <div className="flex items-center space-x-3">
                <div className="w-[60px] h-[60px] rounded-xl bg-slate-50 border border-slate-100/60 overflow-hidden flex items-center justify-center shrink-0">
                  {rec.svg}
                </div>
                <div>
                  <h4 className="text-[15px] font-bold text-slate-900 group-hover:text-cyan-500 transition-colors">{text(rec.title, rec.titleEn)}</h4>
                  <div className="flex items-center space-x-1.5 mt-0.5">
                    <span className="text-[11px] text-slate-500 font-medium font-mono">{rec.date}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 font-mono">{rec.dist} | {rec.duration} | {rec.pace}</p>
                </div>
              </div>

              {/* Accuracy label right */}
              <div className="flex items-center space-x-1 shrink-0">
                <div className="text-right mr-1.5">
                <p className="text-[9px] text-slate-400 leading-none">{text('精准度', 'Accuracy')}</p>
                  <p className={`text-[15px] font-black font-mono leading-none mt-1 ${accuracyColor}`}>{rec.accuracy}%</p>
                </div>
                <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation bottom */}
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

// ----------------------------------------------------------------------
// SCREEN 18: Single Run Detail (单次跑步详情)
// ----------------------------------------------------------------------
export function RunDetailScreen({ onNavigate }: { onNavigate: (screen: ScreenId) => void }) {
  const { text } = useI18n();
  const [entry, setEntry] = useState<RunHistoryEntry | null>(null);

  useEffect(() => {
    const sessionId = localStorage.getItem(SELECTED_RUN_SESSION_ID_KEY);
    getRunHistory()
      .then((items) => {
        setEntry(items.find((item) => item.sessionId === sessionId) || items[0] || null);
      })
      .catch(() => miniToast(text('跑步详情加载失败', 'Failed to load run detail')));
  }, [text]);

  const title = routeTitle(entry?.route);
  const metrics = entry?.metrics || {};
  const distanceM = Number(metrics.actualDistanceM || metrics.plannedDistanceM || entry?.route?.actualDistanceM || 0);
  const durationSec = Number(metrics.timeSec || 0);
  const paceSec = distanceM > 0 && durationSec > 0 ? durationSec / (distanceM / 1000) : 0;
  const paceLabel = paceSec > 0 ? `${Math.floor(paceSec / 60)}'${String(Math.round(paceSec % 60)).padStart(2, '0')}"` : '--';

  return (
    <div className="w-full h-full bg-[#FFFFFF] flex flex-col justify-between overflow-y-auto text-slate-800 animate-fadeIn">
      {/* Top Header */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-gray-100 shrink-0 bg-white">
        <button onClick={() => onNavigate('run_history')} className="p-1 hover:bg-neutral-100 rounded-full">
          <ArrowLeft size={18} className="text-slate-700" />
        </button>
        <span className="text-[16px] font-bold text-slate-900">{text('跑步详情', 'Run Detail')}</span>
        <div className="flex space-x-1">
          <button onClick={() => onNavigate('trace_share')} className="p-1.5 hover:bg-neutral-100 rounded-full">
            <Share2 size={16} className="text-slate-600" />
          </button>
          <button onClick={() => miniToast(text('分享记录', 'Share record'))} className="p-1.5 hover:bg-neutral-100 rounded-full">
            <MoreVertical size={16} className="text-slate-600" />
          </button>
        </div>
      </div>

      {/* Main scroll content */}
      <div className="flex-1 overflow-y-auto pb-6">
        {/* Map area with both planned and actual tracks */}
        <div className="h-[180px] bg-slate-50 relative overflow-hidden flex items-center justify-center border-b border-slate-100">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:16px_16px] opacity-70"></div>
          
          {/* Overlay double path lines SVGs */}
          <div className="relative w-44 h-44 flex items-center justify-center z-10">
            <svg className="absolute inset-0" viewBox="0 0 100 100" fill="none">
              {/* Planned trail (orange dashed) */}
              <path d="M 20,80 Q 25,40 35,40 Q 40,25 50,40 Q 60,25 65,40 Q 75,40 80,80 Q 50,85 20,80" stroke="#FF8038" strokeWidth="2.5" strokeDasharray="4,4" strokeLinecap="round" strokeLinejoin="round" />
              {/* Actual trail (blue solid) */}
              <path d={entry?.actualPath?.length ? 'M 21,80 Q 24,42 34,41 Q 39,23 48,42 Q 58,26 67,41 Q 74,43 79,79 Q 49,83 21,80' : 'M 20,80 Q 25,40 35,40 Q 40,25 50,40 Q 60,25 65,40 Q 75,40 80,80 Q 50,85 20,80'} stroke="#1D4ED8" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />

              {/* Start & End indicator pins */}
              <circle cx="21" cy="80" r="4.5" fill="#10B981" stroke="#FFFFFF" strokeWidth="1" />
              <circle cx="79" cy="79" r="4.5" fill="#EF4444" stroke="#FFFFFF" strokeWidth="1" />
            </svg>
          </div>

          {/* Map Top Right Legend Overlay */}
          <div className="absolute top-2.5 right-2.5 bg-white/95 border border-slate-100 rounded-lg p-2 text-[8px] space-y-1 text-slate-600 scale-90 origin-top-right shadow-sm select-none">
            <div className="flex items-center space-x-1.5">
              <span className="w-4 border-t-2 border-dashed border-[#FF8038]"></span>
              <span className="font-medium">{text('规划轨迹', 'Planned route')}</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-4 border-t-2 border-[#1D4ED8]"></span>
              <span className="font-medium">{text('实际轨迹', 'Actual route')}</span>
            </div>
          </div>
        </div>

        {/* Workout stat metrics cards */}
        <div className="px-4 -mt-3 relative z-10">
          <div className="bg-white p-4 rounded-[24px] shadow-[0_6px_20px_rgba(0,0,0,0.05)] border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-50 pb-2 mb-3">
              <div>
                <h3 className="text-[17px] font-black text-slate-900">{text(title.title, title.titleEn)}</h3>
                <span className="text-[11px] text-slate-500 font-mono">{formatDate(entry?.finishedAt || entry?.startedAt || entry?.createdAt)}</span>
              </div>
              <div className="text-right">
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-extrabold rounded-md border border-emerald-200">
                  {text('极佳贴合', 'Excellent fit')}
                </span>
              </div>
            </div>

            {/* Core workout stats row 1 */}
            <div className="grid grid-cols-3 gap-2 text-center pb-3 border-b border-slate-50">
              <div>
                <span className="text-[18px] font-black text-slate-900 font-mono">{(distanceM / 1000).toFixed(2)}</span>
                <p className="text-[9px] text-slate-400 mt-0.5">{text('总公里(km)', 'Distance (km)')}</p>
              </div>
              <div>
                <span className="text-[18px] font-black text-slate-900 font-mono">{formatDuration(durationSec)}</span>
                <p className="text-[9px] text-slate-400 mt-0.5">{text('用时 (分钟)', 'Duration (min)')}</p>
              </div>
              <div>
                <span className="text-[18px] font-black text-slate-900 font-mono">{paceLabel}</span>
                <p className="text-[9px] text-slate-400 mt-0.5">{text('平均配速', 'Avg pace')}</p>
              </div>
            </div>

            {/* Core workout stats row 2 */}
            <div className="grid grid-cols-3 gap-2 text-center pt-3 select-none">
              <div>
                <span className="text-[18px] font-black text-emerald-500 font-mono">{Math.round(Number(metrics.completionRate || 0)) || '--'}%</span>
                <p className="text-[9px] text-slate-400 mt-0.5">{text('图形贴合度', 'Shape fit')}</p>
              </div>
              <div>
                <span className="text-[18px] font-black text-slate-900 font-mono">{Math.round(Number(metrics.avgDeviationM || 0)) || '--'}m</span>
                <p className="text-[9px] text-slate-400 mt-0.5">{text('最大偏离', 'Max deviation')}</p>
              </div>
              <div>
                <span className="text-[18px] font-black text-slate-900 font-mono">{Math.round(Number(metrics.avgDeviationM || 0)) || '--'}m</span>
                <p className="text-[9px] text-slate-400 mt-0.5">{text('平均偏差', 'Avg deviation')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pace curve vector chart card */}
        <div className="px-4 mt-3">
          <div className="bg-white p-4 rounded-[24px] border border-slate-100 shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] font-extrabold text-slate-900 flex items-center space-x-1">
                <TrendingUp size={14} className="text-cyan-500" />
                <span>{text('实时配速曲线', 'Live pace chart')}</span>
              </span>
              <span className="text-[10px] text-slate-400">{text('最快跑 6\'15"', 'Best 6\'15"')}</span>
            </div>
            
            {/* Elegant SVG pace chart */}
            <div className="h-20 w-full relative mt-2">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 200 60" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chart_grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4FACFE" stopOpacity="0.3"></stop>
                    <stop offset="100%" stopColor="#00F2FE" stopOpacity="0.0"></stop>
                  </linearGradient>
                </defs>
                <path 
                  d="M 0,55 A 15,15 0 0 1 30,30 Q 60,10 90,40 T 150,20 Q 180,35 200,45 L 200,60 L 0,60 Z" 
                  fill="url(#chart_grad)" 
                />
                <path 
                  d="M 0,55 A 15,15 0 0 1 30,30 Q 60,10 90,40 T 150,20 Q 180,35 200,45" 
                  stroke="url(#chart_grad)" 
                  strokeWidth="2.5" 
                  strokeLinecap="round" 
                  fill="none" 
                />
                {/* Min max indicators */}
                <circle cx="90" cy="40" r="3" fill="#EEF2F6" stroke="#4FACFE" strokeWidth="2" />
                <circle cx="60" cy="18" r="3" fill="#EEF2F6" stroke="#F59E0B" strokeWidth="2" />
              </svg>
              <div className="absolute top-2 left-10 text-[8px] bg-amber-50 text-amber-600 px-1 py-0.5 rounded leading-none select-none border border-amber-100">
                {text('最高 6\'10"', 'Peak 6\'10"')}
              </div>
            </div>
            {/* labels axis */}
            <div className="flex justify-between text-[9px] text-slate-400 mt-1 font-mono pt-1">
              <span>0 km</span>
              <span>2.5 km</span>
              <span>5.0 km</span>
            </div>
          </div>
        </div>

        {/* Splitted segments data table */}
        <div className="px-4 mt-3">
          <div className="bg-white p-4 rounded-[24px] border border-slate-100 shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
            <span className="text-[13px] font-extrabold text-slate-900 block mb-3">{text('分段数据详情', 'Split details')}</span>
            <div className="overflow-x-auto scrollbar-none">
              <table className="w-full text-[11px] text-slate-700 font-mono text-left whitespace-nowrap">
                <thead>
                  <tr className="border-b border-slate-50 text-slate-400 font-sans">
                    <th className="pb-2 font-bold">{text('段落', 'Split')}</th>
                    <th className="pb-2 font-bold">{text('耗时/配速', 'Time/Pace')}</th>
                    <th className="pb-2 font-bold text-center">{text('平均心率', 'Avg HR')}</th>
                    <th className="pb-2 font-bold text-right">{text('拟合精度', 'Fit')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 leading-relaxed font-semibold">
                  <tr>
                    <td className="py-2 text-slate-900">{text('第 1 公里', 'Km 1')}</td>
                    <td className="py-2 text-slate-800">6'15" /km</td>
                    <td className="py-2 text-center text-slate-600">142 bpm</td>
                    <td className="py-2 text-right text-emerald-500">98%</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-900">{text('第 2 公里', 'Km 2')}</td>
                    <td className="py-2 text-slate-800">6'22" /km</td>
                    <td className="py-2 text-center text-slate-600">145 bpm</td>
                    <td className="py-2 text-right text-emerald-500">96%</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-900">{text('约3 公里', 'About 3 km')}</td>
                    <td className="py-2 text-slate-800">6'30" /km</td>
                    <td className="py-2 text-center text-slate-600">148 bpm</td>
                    <td className="py-2 text-right text-emerald-500 font-bold">93%</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-900">{text('约4 公里', 'About 4 km')}</td>
                    <td className="py-2 text-slate-800">6'35" /km</td>
                    <td className="py-2 text-center text-slate-600">150 bpm</td>
                    <td className="py-2 text-right text-amber-500 font-bold">91%</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-900">{text('第 5 公里', 'Km 5')}</td>
                    <td className="py-2 text-slate-800">6'28" /km</td>
                    <td className="py-2 text-center text-slate-600">147 bpm</td>
                    <td className="py-2 text-right text-emerald-500">95%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Action button triggers */}
        <div className="px-4 mt-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => onNavigate('trace_share')}
              className="py-3 px-4 border border-slate-200 text-slate-700 hover:bg-neutral-50 active:bg-neutral-100 text-xs font-black rounded-full text-center tracking-wider transition-all"
            >
              {text('分享跑步成绩', 'Share result')}
            </button>
            <button 
              onClick={() => {
                miniToast(text('请先重新生成路线并确认风险', 'Regenerate and confirm route first'));
                onNavigate('quick_cards');
              }}
              className="py-3 px-4 bg-gradient-to-r from-[#4FACFE] to-[#00F2FE] hover:brightness-105 hover:shadow-cyan-400/25 text-white text-xs font-black rounded-full text-center tracking-wider transition-all shadow-md"
            >
              {text('我要再跑一次', 'Run again')}
            </button>
          </div>
          
          <button
            onClick={() => onNavigate('run_history')}
            className="w-full text-center text-xs text-slate-400 hover:text-slate-600 font-semibold underline underline-offset-4"
          >
            {text('返回历史记录列表', 'Back to history')}
          </button>
        </div>
      </div>
    </div>
  );
}

