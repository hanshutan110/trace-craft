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
  TrendingUp
} from 'lucide-react';
import { ScreenId } from '../types';
import { BottomNavBar } from './common/BottomNavBar';

const MY_TRACES_ITEMS = [
  {
    id: 'cat_trace_1',
    title: '猫咪轨迹',
    distance: '5.0km',
    date: '2026-06-09',
    status: 'unrun',
    isFavorite: true,
    svgPath: (
      <svg className="w-10 h-10 text-orange-500" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="4">
        <path d="M 20,80 Q 25,40 35,40 Q 40,25 50,40 Q 60,25 65,40 Q 75,40 80,80 Q 50,85 20,80" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="20" cy="80" r="4" fill="green" />
        <circle cx="80" cy="80" r="4" fill="red" />
      </svg>
    )
  },
  {
    id: 'heart_trace_2',
    title: '心形徽标',
    distance: '4.2km',
    date: '2026-06-07',
    status: 'completed',
    isFavorite: true,
    svgPath: (
      <svg className="w-10 h-10 text-rose-500" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="4">
        <path d="M 50,75 C 10,40 25,10 50,35 C 75,10 90,40 50,75 Z" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="50" cy="75" r="4" fill="red" />
      </svg>
    )
  },
  {
    id: 'star_trace_3',
    title: '五角徽标',
    distance: '5.0km',
    date: '2026-06-05',
    status: 'unrun',
    isFavorite: false,
    svgPath: (
      <svg className="w-10 h-10 text-yellow-500" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="4">
        <path d="M 50,15 L 61,38 L 86,41 L 67,58 L 72,83 L 50,70 L 28,83 L 33,58 L 14,41 L 39,38 Z" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="50" cy="15" r="4" fill="green" />
      </svg>
    )
  }
] as const;

const RUN_HISTORY_RECORDS = [
  {
    id: 'r1',
    title: '猫咪之路',
    date: '2026-06-09',
    dist: '5.01km',
    duration: '32:15',
    pace: '6:27/km',
    accuracy: 94,
    svg: (
      <svg className="w-10 h-10 text-orange-500" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="4">
        <path d="M 20,80 Q 25,40 35,40 Q 40,25 50,40 Q 60,25 65,40 Q 75,40 80,80 Q 50,85 20,80" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  },
  {
    id: 'r2',
    title: '爱心挑战',
    date: '2026-06-07',
    dist: '4.18km',
    duration: '28:30',
    pace: '6:49/km',
    accuracy: 97,
    svg: (
      <svg className="w-10 h-10 text-rose-500" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="4">
        <path d="M 50,75 C 10,40 25,10 50,35 C 75,10 90,40 50,75 Z" />
      </svg>
    )
  },
  {
    id: 'r3',
    title: '星际挑战',
    date: '2026-06-05',
    dist: '5.08km',
    duration: '34:20',
    pace: '6:45/km',
    accuracy: 91,
    svg: (
      <svg className="w-10 h-10 text-yellow-500" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="4">
        <path d="M 50,15 L 61,38 L 86,41 L 67,58 L 72,83 L 50,70 L 28,83 L 33,58 L 14,41 L 39,38 Z" />
      </svg>
    )
  }
] as const;

// ----------------------------------------------------------------------
// SCREEN 14: Splash Screen (启动页)
// ----------------------------------------------------------------------
export function SplashScreen({ onNavigate }: { onNavigate: (screen: ScreenId) => void }) {
  const [loadingStep, setLoadingStep] = useState(0);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setLoadingStep(s => (s + 1) % 4);
    }, 500);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      miniToast('正在自动跳转登录页面...');
      onNavigate('login');
    }, 3000);
    return () => clearTimeout(timer);
  }, [onNavigate]);

  return (
    <div 
      className="w-full h-full bg-gradient-to-tr from-[#4FACFE] to-[#00F2FE] flex flex-col justify-between p-6 text-white text-center relative select-none animate-fadeIn cursor-pointer"
      onClick={() => {
        miniToast('欢迎进入运动应用');
        onNavigate('home');
      }}
    >
      <div className="flex-1 flex flex-col items-center justify-center">
        {/* White circle app icon 100px */}
        <div className="w-[100px] h-[100px] bg-white rounded-full flex items-center justify-center shadow-xl shadow-cyan-500/20 mb-6 group cursor-pointer active:scale-95 transition-transform">
          <svg className="w-14 h-14 text-cyan-500" viewBox="0 0 24 24" fill="currentColor">
            {/* Running Silhouette */}
            <path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 10.2l-.3 1.5C6.4 13 8 14 9.5 14l1.3-.2-.5 2.5-3.8.8c-.3.1-.5.4-.5.7 0 .4.4.7.8.7l4.5-.9c.4-.1.7-.4.8-.8l.8-4.2c.1-.4-.1-.8-.5-.9l-3.3-1zM19.4 8.1c-.2-.4-.5-.6-1-.5l-3.9.7c-.4.1-.7.4-.8.8l-.8 4.2c0 .2.1.4.3.5.2.1.4.1.5-.1l.9-1.9 1.5 2.5c.2.3.5.5.9.5h2.5c.3 0 .5-.2.5-.5s-.2-.5-.5-.5H17.4l-1.3-2.1 1.7-2.1 1.6.4c.1 0 .2 0 .3-.1l1.5-1.1c.2-.2.3-.5.1-.7l-.2-.2z" />
          </svg>
        </div>
        
        {/* Title */}
        <h1 className="text-[28px] font-black tracking-tight drop-shadow-md">
          轨迹运动
        </h1>
        {/* Slogan */}
        <p className="text-14px text-white/80 font-medium tracking-widest mt-2">
          让每一次运动更清晰
        </p>

        {/* Loading dots */}
        <div className="flex items-center space-x-1.5 mt-8 h-4">
          <span className={`w-2.5 h-2.5 rounded-full bg-white transition-all duration-300 ${loadingStep === 0 ? 'scale-125 opacity-100' : 'scale-90 opacity-40'}`}></span>
          <span className={`w-2.5 h-2.5 rounded-full bg-white transition-all duration-300 ${loadingStep === 1 ? 'scale-125 opacity-100' : 'scale-90 opacity-40'}`}></span>
          <span className={`w-2.5 h-2.5 rounded-full bg-white transition-all duration-300 ${loadingStep === 2 ? 'scale-125 opacity-100' : 'scale-90 opacity-40'}`}></span>
        </div>
      </div>

      <div className="space-y-4">
        {/* Interactive fast entrance */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onNavigate('home');
          }}
          className="mx-auto w-[220px] py-3 bg-white text-cyan-600 font-extrabold text-sm rounded-full shadow-lg hover:bg-neutral-50 active:scale-95 transition-all text-center uppercase tracking-wider block"
        >
          继续开始体验        </button>
        <p className="text-[10px] text-white/60 tracking-wider">
          TrackCraft 2026 运动路线智能分析
        </p>
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
  const [activeTab, setActiveTab] = useState<'all' | 'run' | 'unrun' | 'fav'>('all');

  const items = MY_TRACES_ITEMS;

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
        <span className="text-[16px] font-bold text-slate-900">我的轨迹</span>
        <div className="flex space-x-1.5">
          <button onClick={() => onNavigate('search')} className="p-1 hover:bg-neutral-100 rounded-full">
            <Search size={18} className="text-slate-600" />
          </button>
          <button onClick={() => miniToast('打开菜单')} className="p-1 hover:bg-neutral-100 rounded-full">
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
          全部
        </button>
        <button 
          onClick={() => setActiveTab('run')}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${activeTab === 'run' ? 'bg-linear-to-r from-[#4FACFE] to-[#00F2FE] text-white' : 'bg-slate-50 border border-slate-100 text-slate-600'}`}
        >
          已跑
        </button>
        <button 
          onClick={() => setActiveTab('unrun')}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${activeTab === 'unrun' ? 'bg-linear-to-r from-[#4FACFE] to-[#00F2FE] text-white' : 'bg-slate-50 border border-slate-100 text-slate-600'}`}
        >
          未完成
        </button>
        <button 
          onClick={() => setActiveTab('fav')}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${activeTab === 'fav' ? 'bg-linear-to-r from-[#4FACFE] to-[#00F2FE] text-white' : 'bg-slate-50 border border-slate-100 text-slate-600'}`}
        >
            收藏
        </button>
      </div>

      {/* Trace items lists scrollable */}
      <div className="flex-1 overflow-y-auto px-4 pb-16 space-y-3">
        {filtered.length === 0 ? (
          <div className="py-20 text-center text-slate-400 space-y-2">
            <p className="text-sm">暂无我的轨迹内容</p>
            <p className="text-xs text-slate-300">下拉刷新，查看历史记录和统计数据</p>
          </div>
        ) : (
          filtered.map(item => (
            <div 
              key={item.id}
              onClick={() => onNavigate('trace_detail')}
              className="bg-white p-3 rounded-[16px] border border-slate-100 shadow-[0_4px_12px_rgba(0,0,0,0.04)] hover:shadow-md transition-all active:scale-[0.99] flex items-center justify-between cursor-pointer group"
            >
              {/* Thumbnail left */}
              <div className="flex items-center space-x-3">
                <div className="w-[60px] h-[60px] rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100/60 overflow-hidden">
                  {item.svgPath}
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-slate-900 group-hover:text-cyan-600 transition-colors">{item.title}</h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-[12px] text-slate-500 font-medium">{item.distance}</span>
                    <span className="text-[10px] text-slate-400">距</span>
                    <span className="text-[10px] text-slate-400 font-mono">{item.date}</span>
                  </div>
                </div>
              </div>

              {/* Status flag right */}
              <div className="flex flex-col items-end space-y-1">
                {item.status === 'unrun' ? (
                  <span className="px-2 py-0.5 rounded text-[10px] bg-amber-50 text-amber-600 font-semibold border border-amber-200">未完成</span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-600 font-semibold border border-emerald-200">已完成</span>
                )}
                    <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    miniToast(`查看 ${item.title}`);
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
  const [favorite, setFavorite] = useState(false);

  return (
    <div className="w-full h-full bg-[#FFFFFF] flex flex-col justify-between overflow-y-auto text-slate-800 animate-fadeIn">
      {/* Top Header */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-gray-100 bg-white shrink-0">
        <button onClick={() => onNavigate('my_traces')} className="p-1 hover:bg-neutral-100 rounded-full">
          <ArrowLeft size={18} className="text-slate-700" />
        </button>
        <span className="text-[16px] font-bold text-slate-900">轨迹详情</span>
        <div className="flex space-x-1">
          <button onClick={() => { setFavorite(!favorite); miniToast(favorite ? '取消收藏' : '已添加收藏到模板'); }} className="p-1.5 hover:bg-neutral-100 rounded-full">
            <Heart size={16} fill={favorite ? 'red' : 'none'} className={favorite ? 'text-red-500' : 'text-slate-600'} />
          </button>
          <button onClick={() => miniToast('分享轨迹')} className="p-1.5 hover:bg-neutral-100 rounded-full">
            <Share2 size={16} className="text-slate-600" />
          </button>
        </div>
      </div>

      {/* Main Content Areas */}
      <div className="flex-1 overflow-y-auto pb-4">
        {/* Map area */}
        <div className="h-[230px] bg-slate-50 border-b border-slate-100 relative overflow-hidden flex items-center justify-center">
          {/* Mock Grid Map Background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#eef2f6_1px,transparent_1px),linear-gradient(to_bottom,#eef2f6_1px,transparent_1px)] bg-[size:20px_20px] opacity-60"></div>
          
          {/* Drawn cat-shape track line */}
          <svg className="w-48 h-48 text-orange-500 drop-shadow-md relative z-10" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3.5">
            <path d="M 20,80 Q 25,40 35,40 Q 40,25 50,40 Q 60,25 65,40 Q 75,40 80,80 Q 50,85 20,80" strokeLinecap="round" strokeLinejoin="round" />
            
            {/* Start flag green, End flag red */}
            <circle cx="20" cy="80" r="5" fill="#10B981" stroke="#FFFFFF" strokeWidth="1.5" />
            <circle cx="80" cy="80" r="5" fill="#EF4444" stroke="#FFFFFF" strokeWidth="1.5" />
          </svg>

          {/* Indicators overlay */}
          <div className="absolute top-2.5 left-2.5 bg-slate-900/80 text-white text-[9px] px-2 py-0.5 rounded-full border border-slate-800 z-20 font-bold select-none flex items-center space-x-1">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
            <span>GPS 实时定位</span>
          </div>

          <button 
            onClick={() => miniToast('开启全屏查看')}
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
                <span className="text-[20px] font-black text-slate-900">猫咪路线</span>
                <span className="px-1.5 py-0.5 text-[9px] bg-orange-50 text-orange-600 font-bold rounded">未完成</span>
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
                <span className="text-slate-400 font-bold">长</span>
                <span>总长度:</span>
                <strong className="text-slate-900">5.0 km</strong>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-slate-400 font-bold">耗</span>
                <span>耗时:</span>
                <strong className="text-slate-900">30 分钟</strong>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-slate-400 font-bold">时</span>
                <span>创建时间:</span>
                <span className="text-slate-900 font-mono">2026-06-09</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-slate-400 font-bold">配</span>
                <span>平均配速:</span>
                <span className="text-slate-900 font-mono">6'27"/km</span>
              </div>
            </div>
          </div>
        </div>

        {/* Data statistics card */}
        <div className="px-4 mt-3">
          <div className="bg-white p-4 rounded-[24px] border border-slate-100 shadow-[0_4px_16px_rgba(0,0,0,0.03)]/80 flex items-center justify-between text-center select-none">
            <div className="flex-1 border-r border-slate-100">
              <p className="text-[10px] text-slate-400 font-medium">卡路里</p>
              <p className="text-[16px] font-extrabold text-slate-900 mt-0.5">128</p>
            </div>
            <div className="flex-1 border-r border-slate-100">
              <p className="text-[10px] text-slate-400 font-medium">高低变化</p>
              <p className="text-[16px] font-extrabold text-slate-900 mt-0.5">1.0x</p>
            </div>
            <div className="flex-1">
              <p className="text-[10px] text-slate-400 font-medium">平均配速</p>
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
            <span>编辑轨迹</span>
          </button>
          <button 
            onClick={() => {
              miniToast('开始地图导航...');
              onNavigate('nav');
            }}
            className="py-3 px-4 bg-gradient-to-r from-[#4FACFE] to-[#00F2FE] hover:brightness-105 active:scale-98 transition-all text-white font-black text-sm rounded-[32px] flex items-center justify-center space-x-2 shadow-md shadow-cyan-400/20"
          >
            <Play size={15} className="fill-current" />
            <span>开始导航</span>
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
            <span className="text-[10px] text-slate-500 font-medium leading-none">分享</span>
          </button>
          <button 
            onClick={() => miniToast('导出GPX轨迹记录')}
            className="flex flex-col items-center space-y-1 group"
          >
            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-cyan-50 transition-colors text-slate-500 group-hover:text-cyan-600">
              <Download size={16} />
            </div>
            <span className="text-[10px] text-slate-500 font-medium leading-none">导出GPX</span>
          </button>
          <button 
            onClick={() => miniToast('已收藏该模板')}
            className="flex flex-col items-center space-y-1 group"
          >
            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-cyan-50 transition-colors text-slate-500 group-hover:text-cyan-600">
              <Heart size={16} />
            </div>
            <span className="text-[10px] text-slate-500 font-medium leading-none">收藏</span>
          </button>
          <button 
            onClick={() => {
              miniToast('已执行删除轨迹任务');
              onNavigate('my_traces');
            }}
            className="flex flex-col items-center space-y-1 group"
          >
            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-red-50 transition-colors text-slate-500 group-hover:text-red-500">
              <Trash2 size={16} />
            </div>
            <span className="text-[10px] text-slate-500 font-medium leading-none">删除</span>
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
  const [activeTab, setActiveTab] = useState<'all' | 'month' | 'week' | 'custom'>('all');

  const records = RUN_HISTORY_RECORDS;

  return (
    <div className="w-full h-full bg-[#FFFFFF] flex flex-col justify-between text-slate-800 animate-fadeIn">
      {/* Top Header */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-gray-100 shrink-0 bg-white">
        <button onClick={() => onNavigate('profile')} className="p-1 hover:bg-neutral-100 rounded-full">
          <ArrowLeft size={18} className="text-slate-700" />
        </button>
        <span className="text-[16px] font-bold text-slate-900">历史记录</span>
        <div className="flex space-x-1">
          <button onClick={() => miniToast('开启筛选条件')} className="p-1.5 hover:bg-neutral-100 rounded-full">
            <Filter size={16} className="text-slate-600" />
          </button>
          <button onClick={() => miniToast('选择日期范围')} className="p-1.5 hover:bg-neutral-100 rounded-full">
            <Calendar size={16} className="text-slate-600" />
          </button>
        </div>
      </div>

      {/* Main stats summary top card */}
      <div className="px-4 pt-3 shrink-0">
        <div className="bg-slate-900 text-white rounded-[24px] p-4 shadow-md bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-755">
          <span className="text-[10px] text-teal-400 font-extrabold uppercase tracking-widest block mb-2">RUNNING SUMMARY / 运动总结</span>
          <div className="grid grid-cols-3 gap-1 select-none">
            <div className="text-center border-r border-slate-800/80">
              <span className="text-[20px] font-black font-mono text-white">28</span>
              <p className="text-[9px] text-slate-400 mt-0.5">里程 (km)</p>
            </div>
            <div className="text-center border-r border-slate-800/80">
              <span className="text-[20px] font-black font-mono text-white">328</span>
              <p className="text-[9px] text-slate-400 mt-0.5">距离 (KM)</p>
            </div>
            <div className="text-center">
              <span className="text-[20px] font-black font-mono text-white">42</span>
              <p className="text-[9px] text-slate-400 mt-0.5">时间 (分钟)</p>
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
            {tab === 'all' && '全部'}
            {tab === 'month' && '本月'}
            {tab === 'week' && '本周'}
            {tab === 'custom' && '自定义'}
          </button>
        ))}
      </div>

      {/* List content */}
      <div className="flex-1 overflow-y-auto px-4 pb-16 space-y-3">
        {records.map(rec => {
          const isExcellent = rec.accuracy >= 95;
          const isWarn = rec.accuracy < 95 && rec.accuracy >= 90;
          const accuracyColor = isExcellent ? 'text-emerald-500' : isWarn ? 'text-amber-500' : 'text-rose-500';

          return (
            <div
              key={rec.id}
              onClick={() => onNavigate('run_detail')}
              className="bg-white p-3.5 rounded-[16px] border border-slate-100 shadow-[0_4px_12px_rgba(0,0,0,0.03)] cursor-pointer flex items-center justify-between group active:scale-[0.99] transition-all"
            >
              <div className="flex items-center space-x-3">
                <div className="w-[60px] h-[60px] rounded-xl bg-slate-50 border border-slate-100/60 overflow-hidden flex items-center justify-center shrink-0">
                  {rec.svg}
                </div>
                <div>
                  <h4 className="text-[15px] font-bold text-slate-900 group-hover:text-cyan-500 transition-colors">{rec.title}</h4>
                  <div className="flex items-center space-x-1.5 mt-0.5">
                    <span className="text-[11px] text-slate-500 font-medium font-mono">{rec.date}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 font-mono">{rec.dist} | {rec.duration} | {rec.pace}</p>
                </div>
              </div>

              {/* Accuracy label right */}
              <div className="flex items-center space-x-1 shrink-0">
                <div className="text-right mr-1.5">
                <p className="text-[9px] text-slate-400 leading-none">精准度</p>
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
  return (
    <div className="w-full h-full bg-[#FFFFFF] flex flex-col justify-between overflow-y-auto text-slate-800 animate-fadeIn">
      {/* Top Header */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-gray-100 shrink-0 bg-white">
        <button onClick={() => onNavigate('run_history')} className="p-1 hover:bg-neutral-100 rounded-full">
          <ArrowLeft size={18} className="text-slate-700" />
        </button>
        <span className="text-[16px] font-bold text-slate-900">跑步详情</span>
        <div className="flex space-x-1">
          <button onClick={() => onNavigate('trace_share')} className="p-1.5 hover:bg-neutral-100 rounded-full">
            <Share2 size={16} className="text-slate-600" />
          </button>
          <button onClick={() => miniToast('分享记录')} className="p-1.5 hover:bg-neutral-100 rounded-full">
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
              <path 
                d="M 20,80 Q 25,40 35,40 Q 40,25 50,40 Q 60,25 65,40 Q 75,40 80,80 Q 50,85 20,80" 
                stroke="#FF8038" 
                strokeWidth="2.5" 
                strokeDasharray="4,4" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />
              {/* Actual trail (blue solid) */}
              <path 
                d="M 21,80 Q 24,42 34,41 Q 39,23 48,42 Q 58,26 67,41 Q 74,43 79,79 Q 49,83 21,80" 
                stroke="#1D4ED8" 
                strokeWidth="3.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />

              {/* Start & End indicator pins */}
              <circle cx="21" cy="80" r="4.5" fill="#10B981" stroke="#FFFFFF" strokeWidth="1" />
              <circle cx="79" cy="79" r="4.5" fill="#EF4444" stroke="#FFFFFF" strokeWidth="1" />
            </svg>
          </div>

          {/* Map Top Right Legend Overlay */}
          <div className="absolute top-2.5 right-2.5 bg-white/95 border border-slate-100 rounded-lg p-2 text-[8px] space-y-1 text-slate-600 scale-90 origin-top-right shadow-sm select-none">
            <div className="flex items-center space-x-1.5">
              <span className="w-4 border-t-2 border-dashed border-[#FF8038]"></span>
              <span className="font-medium">规划轨迹</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-4 border-t-2 border-[#1D4ED8]"></span>
              <span className="font-medium">实际轨迹</span>
            </div>
          </div>
        </div>

        {/* Workout stat metrics cards */}
        <div className="px-4 -mt-3 relative z-10">
          <div className="bg-white p-4 rounded-[24px] shadow-[0_6px_20px_rgba(0,0,0,0.05)] border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-50 pb-2 mb-3">
              <div>
                <h3 className="text-[17px] font-black text-slate-900">小猫跑</h3>
                <span className="text-[11px] text-slate-500 font-mono">2026-06-08 周一</span>
              </div>
              <div className="text-right">
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-extrabold rounded-md border border-emerald-200">
                  极佳贴合
                </span>
              </div>
            </div>

            {/* Core workout stats row 1 */}
            <div className="grid grid-cols-3 gap-2 text-center pb-3 border-b border-slate-50">
              <div>
                <span className="text-[18px] font-black text-slate-900 font-mono">5.01</span>
                <p className="text-[9px] text-slate-400 mt-0.5">总公里(km)</p>
              </div>
              <div>
                <span className="text-[18px] font-black text-slate-900 font-mono">32:15</span>
                <p className="text-[9px] text-slate-400 mt-0.5">用时 (分钟)</p>
              </div>
              <div>
                <span className="text-[18px] font-black text-slate-900 font-mono">6'27"</span>
                <p className="text-[9px] text-slate-400 mt-0.5">平均配速</p>
              </div>
            </div>

            {/* Core workout stats row 2 */}
            <div className="grid grid-cols-3 gap-2 text-center pt-3 select-none">
              <div>
                <span className="text-[18px] font-black text-emerald-500 font-mono">94%</span>
                <p className="text-[9px] text-slate-400 mt-0.5">图形贴合度</p>
              </div>
              <div>
                <span className="text-[18px] font-black text-slate-900 font-mono">23m</span>
                <p className="text-[9px] text-slate-400 mt-0.5">最大偏离</p>
              </div>
              <div>
                <span className="text-[18px] font-black text-slate-900 font-mono">8m</span>
                <p className="text-[9px] text-slate-400 mt-0.5">平均偏差</p>
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
                <span>实时配速曲线</span>
              </span>
              <span className="text-[10px] text-slate-400">最快跑 6'15"</span>
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
                最高 6'10"
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
            <span className="text-[13px] font-extrabold text-slate-900 block mb-3">分段数据详情</span>
            <div className="overflow-x-auto scrollbar-none">
              <table className="w-full text-[11px] text-slate-700 font-mono text-left whitespace-nowrap">
                <thead>
                  <tr className="border-b border-slate-50 text-slate-400 font-sans">
                    <th className="pb-2 font-bold">段落</th>
                    <th className="pb-2 font-bold">耗时/配速</th>
                    <th className="pb-2 font-bold text-center">平均心率</th>
                    <th className="pb-2 font-bold text-right">拟合精度</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 leading-relaxed font-semibold">
                  <tr>
                    <td className="py-2 text-slate-900">第 1 公里</td>
                    <td className="py-2 text-slate-800">6'15" /km</td>
                    <td className="py-2 text-center text-slate-600">142 bpm</td>
                    <td className="py-2 text-right text-emerald-500">98%</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-900">第 2 公里</td>
                    <td className="py-2 text-slate-800">6'22" /km</td>
                    <td className="py-2 text-center text-slate-600">145 bpm</td>
                    <td className="py-2 text-right text-emerald-500">96%</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-900">约3 公里</td>
                    <td className="py-2 text-slate-800">6'30" /km</td>
                    <td className="py-2 text-center text-slate-600">148 bpm</td>
                    <td className="py-2 text-right text-emerald-500 font-bold">93%</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-900">约4 公里</td>
                    <td className="py-2 text-slate-800">6'35" /km</td>
                    <td className="py-2 text-center text-slate-600">150 bpm</td>
                    <td className="py-2 text-right text-amber-500 font-bold">91%</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-900">第 5 公里</td>
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
              分享跑步成绩
            </button>
            <button 
              onClick={() => {
                miniToast('查看并添加该轨迹到导航');
                onNavigate('nav');
              }}
              className="py-3 px-4 bg-gradient-to-r from-[#4FACFE] to-[#00F2FE] hover:brightness-105 hover:shadow-cyan-400/25 text-white text-xs font-black rounded-full text-center tracking-wider transition-all shadow-md"
            >
              我要再跑一次            </button>
          </div>
          
          <button
            onClick={() => onNavigate('run_history')}
            className="w-full text-center text-xs text-slate-400 hover:text-slate-600 font-semibold underline underline-offset-4"
          >
            返回历史记录列表
          </button>
        </div>
      </div>
    </div>
  );
}

