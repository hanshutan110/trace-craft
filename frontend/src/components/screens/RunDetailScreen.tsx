/**
 * RunDetailScreen - 单次跑步详情
 *
 * 从原 TraceJourneyScreens.tsx 拆分而来。
 * 功能：展示单次跑步的详细数据，包含规划/实际轨迹对比地图、运动指标统计、
 * 配速曲线图表和分段数据表格。
 *
 * @source 拆分自 components/TraceJourneyScreens.tsx (SCREEN 18)
 */
import { useState, useEffect } from 'react';
import { miniToast } from '../../utils';
import {
  ArrowLeft,
  Share2,
  MoreVertical,
  TrendingUp,
} from 'lucide-react';
import { ScreenId } from '../../types';
import { useI18n } from '../../i18n';
import { getRunHistory, type RunHistoryEntry } from '../../api/user';
import {
  routeTitle,
  formatDate,
  formatDuration,
  SELECTED_RUN_SESSION_ID_KEY,
} from './trace-journey-utils';

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
