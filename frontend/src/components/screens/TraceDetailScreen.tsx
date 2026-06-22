/**
 * TraceDetailScreen - 轨迹详情
 *
 * 从原 TraceJourneyScreens.tsx 拆分而来。
 * 功能：展示单条轨迹的详细信息，包括地图预览、路线数据、操作按钮（编辑/导航/分享/收藏/删除）。
 *
 * @source 拆分自 components/TraceJourneyScreens.tsx (SCREEN 16)
 */
import { useState, useEffect } from 'react';
import { miniToast } from '../../utils';
import {
  ArrowLeft,
  Edit,
  Play,
  Share2,
  Download,
  Heart,
  Trash2,
  Maximize2,
} from 'lucide-react';
import { ScreenId } from '../../types';
import { useI18n } from '../../i18n';
import type { GeneratedRoute } from '../../types';
import { getRoute } from '../../api/routes';
import {
  routeTitle,
  routeIcon,
  formatDate,
  formatKm,
  SELECTED_ROUTE_ID_KEY,
} from './trace-journey-utils';

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
