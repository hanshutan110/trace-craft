/**
 * OnboardingScreen - 首次使用引导页
 *
 * 从原 AuthScreens.tsx 拆分而来。
 * 功能：应用首次启动时的引导页面，展示品牌 Logo、今日轨迹预览卡片、
 *       三大核心功能介绍（实时轨迹/运动数据/路线回顾），
 *       提供"继续体验"和"已有账号登录"两个入口。
 *
 * @source 拆分自 components/AuthScreens.tsx (SCREEN 5)
 */

import React from 'react';
import {
  Activity,
  Route,
  Timer,
} from 'lucide-react';
import { ScreenId } from '../../types';
import { useI18n } from '../../i18n';

/* ==========================================
   Onboarding Screen (首次使用引导页)
   ========================================== */
interface OnboardingScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onNavigate }) => {
  const { t } = useI18n();
  const features = [
    {
      icon: Route,
      title: t('实时轨迹', 'Live route'),
      desc: t('边跑边校准方向', 'Adjust direction while running'),
      tone: 'text-cyan-600 bg-cyan-50 border-cyan-100',
    },
    {
      icon: Activity,
      title: t('运动数据', 'Run metrics'),
      desc: t('距离、时间、配速清晰记录', 'Distance, time, pace tracked clearly'),
      tone: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    },
    {
      icon: Timer,
      title: t('路线回顾', 'Route replay'),
      desc: t('复盘每一次轨迹表现', 'Review every route performance'),
      tone: 'text-amber-600 bg-amber-50 border-amber-100',
    },
  ];

  return (
    <div className="w-full max-w-full h-full min-h-[100dvh] bg-[#f8fbf7] flex flex-col text-slate-950 select-none relative overflow-hidden">
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
        <h1 className="relative z-10 text-[29px] font-black tracking-tight drop-shadow-md">{t('轨迹运动', 'Trace Run')}</h1>
        <p className="relative z-10 text-[14px] text-white/85 font-semibold tracking-[0.08em] mt-2">{t('让每一次运动更清晰', 'Make every run clearer')}</p>
        <div className="relative z-10 flex items-center gap-1.5 mt-8 h-4" aria-hidden="true">
          <span className="w-2 h-2 rounded-full bg-white/45"></span>
          <span className="w-2 h-2 rounded-full bg-white/45"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-white"></span>
        </div>
      </div>

      <div className="w-full max-w-full min-w-0 flex-1 min-h-0 overflow-x-hidden overflow-y-auto scrollbar-none flex flex-col justify-between px-5 pt-5 pb-[calc(20px+env(safe-area-inset-bottom))]">
        <div className="w-full max-w-[390px] mx-auto space-y-4 shrink-0">
          <div className="w-full max-w-full min-w-0 overflow-hidden rounded-[24px] bg-white border border-slate-100 shadow-[0_18px_42px_rgba(15,23,42,0.08)] p-4">
            <div className="flex items-center justify-between gap-3 mb-3 min-w-0">
              <div className="min-w-0">
                <p className="text-[11px] font-black text-cyan-600 tracking-[0.14em] uppercase">TraceCraft</p>
                <h2 className="text-[18px] font-black text-slate-950 mt-0.5 leading-tight">{t('今天的轨迹预览', 'Today route preview')}</h2>
              </div>
              <span className="shrink-0 px-2 py-1 rounded-full bg-amber-50 text-amber-700 text-[10px] font-extrabold border border-amber-100">
                {t('智能分析', 'Smart')}
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
                <p className="text-[10px] font-semibold text-slate-500 mt-0.5">{t('时间', 'Time')}</p>
              </div>
              <div>
                <span className="text-[18px] font-black font-mono text-slate-950">5'58"</span>
                <p className="text-[10px] font-semibold text-slate-500 mt-0.5">{t('配速', 'Pace')}</p>
              </div>
            </div>
          </div>

          <div className="w-full max-w-full min-w-0 grid grid-cols-3 gap-2 overflow-hidden">
            {features.map((item) => {
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
            onClick={() => onNavigate('home')}
            className="w-full min-h-[48px] bg-slate-950 text-white font-black text-sm rounded-full shadow-lg shadow-[0_14px_30px_rgba(15,23,42,0.18)] hover:bg-slate-800 active:scale-[0.98] transition-all text-center tracking-[0.08em]"
          >
            {t('继续开始体验', 'Continue')}
          </button>
          <button
            onClick={() => onNavigate('login')}
            className="w-full text-center text-[12px] text-slate-500 hover:text-slate-800 transition-colors"
          >
            {t('onboarding.has_account', '已有账号？')}<span className="font-bold underline underline-offset-4">{t('onboarding.login', '登录')}</span>
          </button>
          <p className="text-center text-[10px] text-slate-400 tracking-[0.08em]">
            {t('TrackCraft 2026 运动路线智能分析', 'TrackCraft 2026 intelligent route analysis')}
          </p>
        </div>
      </div>
    </div>
  );
};
