/**
 * TemplateDetailScreen - 模板详情
 *
 * 从原 DiscoveryScreens.tsx 拆分而来。
 * 功能：展示路线模板的详细信息，包含图形预览、运动参数、用户评价和收藏/使用操作。
 *
 * @source 拆分自 components/DiscoveryScreens.tsx (SCREEN 20)
 */
import { useState, useEffect } from 'react';
import { miniToast } from '../../utils';
import { ArrowLeft, Heart, ExternalLink } from 'lucide-react';
import { ScreenId } from '../../types';
import { useI18n } from '../../i18n';
import {
  addFavorite,
  getSelectedTemplateId,
  getTemplate,
  removeFavorite,
  type RouteTemplateItem,
} from '../../api/discovery';
import { shapeIcon } from './discovery-utils';

export function TemplateDetailScreen({ onNavigate }: { onNavigate: (screen: ScreenId) => void }) {
  const { text } = useI18n();
  const [favorite, setFavorite] = useState(true);
  const [template, setTemplate] = useState<RouteTemplateItem | null>(null);

  useEffect(() => {
    let cancelled = false;
    const templateId = getSelectedTemplateId() || 'tpl-heart';
    getTemplate(templateId)
      .then((item) => {
        if (!cancelled) setTemplate(item);
      })
      .catch(() => {
        if (!cancelled) setTemplate(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const shapeType = template?.shapeType || 'heart';
  const title = template ? text(template.title, template.titleEn) : text('爱心挑战', 'Heart Challenge');
  const distanceKm = template?.distanceKm ?? 4.2;
  const usageCount = template?.usageCount ?? 128;
  const toggleFavorite = async () => {
    if (!template) return;
    if (favorite) {
      await removeFavorite('template', template.id);
    } else {
      await addFavorite('template', template.id);
    }
    setFavorite(!favorite);
    miniToast(text(favorite ? '取消收藏' : '已添加收藏', favorite ? 'Removed from favorites' : 'Added to favorites'));
  };

  return (
    <div className="w-full h-full bg-[#FFFFFF] flex flex-col justify-between overflow-y-auto text-slate-800 animate-fadeIn">
      {/* Top Header */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-gray-100 shrink-0 bg-white">
        <button onClick={() => onNavigate('favorites')} className="p-1 hover:bg-neutral-100 rounded-full">
          <ArrowLeft size={18} className="text-slate-700" />
        </button>
        <span className="text-[16px] font-bold text-slate-900">{text('模板详情', 'Template Detail')}</span>
        <div className="flex space-x-1.5">
          <button onClick={() => miniToast(text('分享模板数据', 'Share template data'))} className="p-1.5 hover:bg-neutral-100 rounded-full">
            <ExternalLink size={16} className="text-slate-600" />
          </button>
          <button onClick={() => { void toggleFavorite(); }} className="p-1.5 hover:bg-neutral-100 rounded-full">
            <Heart size={16} fill={favorite ? 'red' : 'none'} className={favorite ? 'text-red-500' : 'text-slate-600'} />
          </button>
        </div>
      </div>

      {/* Main stats visual template body */}
      <div className="flex-1 overflow-y-auto pb-4 select-none">
        
        {/* Template graphic preview area */}
        <div className="py-6 px-4 flex flex-col items-center justify-center bg-slate-50/50 border-b border-slate-100 relative">
          <div className="w-48 h-48 bg-white rounded-3xl border border-slate-100 shadow-sm flex items-center justify-center p-3">
            {shapeIcon(shapeType, 'w-36 h-36 drop-shadow-sm animate-pulse')}
          </div>

          <h3 className="text-[20px] font-black text-slate-900 mt-4">{title}</h3>
          <p className="text-[11px] text-[#4FACFE] font-bold mt-1">{text('❤️ 官方推荐跑步打卡艺术路线', 'Officially recommended art route for running check-ins')}</p>
        </div>

        {/* Info detail block list */}
        <div className="px-4 mt-4">
          <div className="bg-white p-4 rounded-[24px] shadow-[0_4px_16px_rgba(0,0,0,0.03)] border border-slate-100 space-y-4">
            
            <div className="flex items-center justify-between text-[13px] border-b border-slate-50 pb-2.5">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                <span className="text-slate-500">{text('预计跑距', 'Estimated distance')}</span>
              </div>
                <strong className="text-slate-900 font-bold">{distanceKm.toFixed(1)} km</strong>
            </div>

            <div className="flex items-center justify-between text-[13px] border-b border-slate-50 pb-2.5">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                <span className="text-slate-500">{text('预计时长', 'Estimated time')}</span>
              </div>
                <strong className="text-slate-900 font-bold">{text('25 分钟', '25 min')}</strong>
            </div>

            <div className="flex items-center justify-between text-[13px] border-b border-slate-50 pb-2.5">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                <span className="text-slate-500">{text('已完成', 'Completed')}</span>
              </div>
              <strong className="text-slate-930 text-rose-500 font-extrabold">{text(`${usageCount} 次`, `${usageCount} runs`)}</strong>
            </div>

            <div className="flex items-center justify-between text-[13px]">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                <span className="text-slate-500">{text('创建者', 'Creator')}</span>
              </div>
              <span className="font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px]">{text('官方认证模板', 'Verified template')}</span>
            </div>

          </div>
        </div>

        {/* Filter tags bubble pills info banner */}
        <div className="px-4 mt-3 flex flex-wrap gap-2">
          <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-red-50 text-red-500 border border-red-100">{text('🔥 热门推荐', '🔥 Hot pick')}</span>
          <span className="px-3 py-1 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-500 border border-rose-100">{text('🍬 甜度饱满', '🍬 Sweet spot')}</span>
          <span className="px-3 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">{text('🌟 新手友好', '🌟 Beginner friendly')}</span>
        </div>

        {/* User outcomes dynamic horizontal list */}
        <div className="px-4 mt-4 text-left">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[13px] font-black text-slate-800">{text('大家跑出来的真实效果', 'Real results from runners')}</span>
            <button onClick={() => { onNavigate('square'); }} className="text-[10px] text-cyan-600 font-semibold hover:underline">{text('查看全广场评价', 'View all community reviews')}</button>
          </div>

          <div className="flex space-x-3 overflow-x-auto pb-1 scrollbar-none">
            {[1, 2, 3].map((val) => (
              <div 
                key={val}
                className="w-[110px] p-2 rounded-xl bg-slate-50 border border-slate-100 text-center flex flex-col items-center space-y-1.5 cursor-pointer shrink-0"
                onClick={() => { miniToast(text(`查看第 ${val} 种使用场景`, `View use case ${val}`)); }}
              >
                <div className="w-12 h-12 bg-white rounded-full border border-slate-100 flex items-center justify-center">
                  {shapeIcon(shapeType, 'w-8 h-8')}
                </div>
                <span className="text-[9px] text-slate-400 font-semibold truncate max-w-full">
                  {text(val === 1 ? '舒适' : val === 2 ? '节奏' : '竞技', val === 1 ? 'Comfort' : val === 2 ? 'Rhythm' : 'Competition')}
                </span>
                <span className="text-[8px] bg-emerald-100/60 text-emerald-600 rounded px-1 scale-95 leading-none">
                  {text(`9${val === 1 ? '7' : val === 2 ? '5' : '4'}% 吻合`, `9${val === 1 ? '7' : val === 2 ? '5' : '4'}% match`)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Bottom Buttons */}
        <div className="px-4 mt-5 grid grid-cols-2 gap-3">
          <button 
            onClick={() => {
              miniToast(text('正在生成大地图实景预览..', 'Generating large map preview...'));
              onNavigate('trace_detail');
            }}
            className="py-3 px-4 border border-slate-200 text-slate-700 bg-white hover:bg-neutral-50 active:scale-98 text-xs font-black rounded-full transition-all text-center uppercase tracking-wider"
          >
            {text('预览完整路线', 'Preview full route')}
          </button>
          <button 
            onClick={() => {
              miniToast(text('已导入该模板，请配置调节变换', 'Template imported. Adjust settings next.'));
              onNavigate('param_adjust');
            }}
            className="py-3 px-4 bg-gradient-to-r from-[#4FACFE] to-[#00F2FE] hover:brightness-105 active:scale-98 text-white text-xs font-black rounded-full shadow-md shadow-cyan-400/20 transition-all text-center uppercase tracking-wider"
          >
            {text('直接使用此模板', 'Use this template')}
          </button>
        </div>

      </div>
    </div>
  );
}
