/**
 * RunHistoryScreen - 历史跑步记录
 *
 * 从原 TraceJourneyScreens.tsx 拆分而来。
 * 功能：展示用户所有跑步历史记录列表，包含运动总结统计卡片和时间筛选标签。
 * 点击单条记录可跳转到 RunDetailScreen 查看详情。
 *
 * @source 拆分自 components/TraceJourneyScreens.tsx (SCREEN 17)
 */
import { useState, useEffect } from 'react';
import { miniToast } from '../../utils';
import {
  ArrowLeft,
  Filter,
  Calendar,
  ChevronRight,
} from 'lucide-react';
import { ScreenId } from '../../types';
import { BottomNavBar } from '../common/BottomNavBar';
import { useI18n } from '../../i18n';
import { getRunHistory, type RunHistoryEntry } from '../../api/user';
import {
  toHistoryRecord,
  SELECTED_RUN_SESSION_ID_KEY,
} from './trace-journey-utils';

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
