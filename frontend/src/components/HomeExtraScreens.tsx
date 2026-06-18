/**
 * 首页扩展屏幕
 *
 * 从 HomeAndLibrary.tsx 拆分，包含 QuickTemplateScreen 和 FullLibraryScreen。
 * 避免 AppScreenRouter 对 HomeAndLibrary 的静态/动态混合导入冲突。
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Star,
  Flame,
  Heart,
  Circle,
  Square,
  Triangle,
  Search,
  Plus,
} from 'lucide-react';
import { ScreenId } from '../types';
import { useI18n } from '../i18n';
import { listTemplates, selectTemplate, type RouteTemplateItem } from '../api/discovery';

const FULL_LIBRARY_TABS = [
  { id: 'recommend', label: '推荐' },
  { id: 'base', label: '基础图形' },
  { id: 'animal', label: '动物' },
  { id: 'text', label: '文字' },
  { id: 'holiday', label: '节日' },
] as const;

/** 根据图形类型渲染对应图标（心形/星形/圆形/三角/方形） */
function templateIcon(shapeType: string, size: number = 40) {
  if (shapeType === 'heart') return <Heart size={size} className="fill-white stroke-none text-white/95" />;
  if (shapeType === 'star') return <Star size={size} className="fill-white stroke-none text-white/95" />;
  if (shapeType === 'circle') return <Circle size={size} className="stroke-[3.5] text-white" />;
  if (shapeType === 'triangle') return <Triangle size={size} className="stroke-[3.5] text-white" />;
  if (shapeType === 'square') return <Square size={size} className="stroke-[3.5] text-white" />;
  return <span className="font-bold text-white text-base">{shapeType.slice(0, 1).toUpperCase()}</span>;
}

/** 获取图形对应的渐变色背景（CSS linear-gradient） */
function templateGradient(shapeType: string): string {
  const gradients: Record<string, string> = {
    heart: 'linear-gradient(135deg, #FF758C 0%, #FF7EB3 100%)',
    star: 'linear-gradient(135deg, #FFD166 0%, #FFB347 100%)',
    circle: 'linear-gradient(135deg, #4FACFE 0%, #00F2FE 100%)',
    triangle: 'linear-gradient(135deg, #FF6B6B 0%, #EE5A24 100%)',
    square: 'linear-gradient(135deg, #A8E6CF 0%, #3BAC6A 100%)',
    hexagon: 'linear-gradient(135deg, #A29BFE 0%, #6C5CE7 100%)',
  };
  return gradients[shapeType] || 'linear-gradient(135deg, #64748B 0%, #0F766E 100%)';
}

/** 获取图形对应的 Tailwind 渐变 class */
function templateClassGradient(shapeType: string): string {
  const gradients: Record<string, string> = {
    heart: 'from-[#FF758C] to-[#FF7EB3]',
    star: 'from-[#FFD166] to-[#FFB347]',
    circle: 'from-[#4FACFE] to-[#00F2FE]',
    triangle: 'from-[#FF6B6B] to-[#EE5A24]',
    square: 'from-[#3BAC6A] to-[#68D391]',
    hexagon: 'from-[#A29BFE] to-[#6C5CE7]',
  };
  return gradients[shapeType] || 'from-slate-500 to-teal-700';
}

/** 将模板项的 shapeType 映射为内部支持的图形 ID */
function templateToShapeId(template: RouteTemplateItem): string {
  return ['circle','triangle','star','square','heart','hexagon'].includes(template.shapeType) ? template.shapeType : 'star';
}

/* ==========================================
   Screen 8: Quick Presets (快速模板卡片页)
   ========================================== */
interface QuickTemplateScreenProps {
  onNavigate: (screen: ScreenId) => void;
  onSelectShape: (shapeId: string) => void;
  onGenerateTemplateRoute: (shapeId: string, targetKm?: number) => Promise<void>;
  onUploadImageRoute: (file: File) => Promise<void>;
}

export const QuickTemplateScreen: React.FC<QuickTemplateScreenProps> = ({
  onNavigate,
  onSelectShape,
  onGenerateTemplateRoute,
  onUploadImageRoute,
}) => {
  const { t } = useI18n();
  const [templates, setTemplates] = useState<RouteTemplateItem[]>([]);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const cards = templates.slice(0, 6).map((item) => ({
        id: item.id,
        shapeId: templateToShapeId(item),
        title: item.title,
        distance: `约${item.distanceKm.toFixed(1)}km`,
        gradient: templateGradient(item.shapeType),
        icon: templateIcon(item.shapeType, 44),
        tagColor: 'bg-white/20 text-white',
      }));

  useEffect(() => {
    let cancelled = false;
    listTemplates({ featured: true, limit: 8 })
      .then((items) => {
        if (!cancelled) setTemplates(items);
      })
      .catch(() => {
        if (!cancelled) setTemplates([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-white select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3 border-b border-gray-50">
        <button onClick={() => onNavigate('home')} className="p-1 rounded-full text-gray-500 active:bg-gray-100">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-base font-bold text-gray-900">{t('quick.title', '快速模板')}</h1>
        <button className="p-1 rounded-full text-gray-600 active:bg-gray-100">
          <Search size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
        
        {/* Horizontal Scrolling Card List */}
        <div>
          <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-none">
            {cards.map((card, _idx) => (
              <div
                key={card.id}
                onClick={() => {
                  selectTemplate(card.id);
                  onSelectShape(card.shapeId);
                  void onGenerateTemplateRoute(card.shapeId);
                }}
                style={{ background: card.gradient }}
                className="min-w-[144px] w-[144px] h-[168px] rounded-[24px] p-4 flex flex-col justify-between text-white shadow-[0_6px_16px_rgba(0,0,0,0.06)] cursor-pointer active:scale-98 transition-all hover:brightness-105"
              >
                <div className="w-12 h-12 flex items-center justify-center mb-2">
                  {card.icon}
                </div>
                <div>
                  <h3 className="text-[14px] font-bold tracking-tight">
                    {t(`quick.card.${card.shapeId}`, card.title)}
                  </h3>
                  <p className="text-[10px] text-white/80 mt-0.5">
                    {t(`quick.card.${card.shapeId}_dist`, card.distance)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recently Used Block */}
        <div>
          <h2 className="text-[14px] font-bold text-gray-800 mb-3">{t('quick.frequent_title', '最近经常完成')}</h2>
          <div className="flex space-x-3">
            <div className="flex items-center space-x-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100">
              <div className="w-7 h-7 rounded-full bg-pink-100 flex items-center justify-center text-xs">💖</div>
              <div className="text-left">
                <p className="text-xs font-bold text-gray-800 leading-none">{t('quick.recent.heart', '心形')}</p>
                <p className="text-[9px] text-[#4FACFE] mt-0.5">{t('quick.recent.3runs', '3次跑步')}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100">
              <div className="w-7 h-7 rounded-full bg-yellow-100 flex items-center justify-center text-xs">⭐</div>
              <div className="text-left">
                <p className="text-xs font-bold text-gray-800 leading-none">{t('quick.recent.star', '五角星')}</p>
                <p className="text-[9px] text-[#4FACFE] mt-0.5">{t('quick.recent.2runs', '2次跑步')}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100">
              <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs">🌀</div>
              <div className="text-left">
                <p className="text-xs font-bold text-gray-800 leading-none">{t('quick.recent.lake', '环湖')}</p>
                <p className="text-[9px] text-[#4FACFE] mt-0.5">{t('quick.recent.4runs', '4次跑步')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Button Accent */}
        <button
          onClick={() => uploadInputRef.current?.click()}
          className="w-full flex items-center justify-center space-x-2 border-2 border-dashed border-gray-200 hover:border-[#4FACFE] py-4 rounded-2xl text-gray-500 hover:text-[#4FACFE] font-medium transition-colors bg-gray-50/50 mt-4"
        >
          <Plus size={18} />
          <span className="text-[13px]">{t('quick.upload_more', '上传自定义图片')}</span>
        </button>
        <input
          ref={uploadInputRef}
          id="quick_upload_image"
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            void onUploadImageRoute(file);
            event.target.value = '';
          }}
        />

      </div>
    </div>
  );
};


/* ==========================================
   Screen 10: Full Preset Library (预设图形选择页)
   ========================================== */
interface FullLibraryScreenProps {
  onNavigate: (screen: ScreenId) => void;
  onSelectShape: (shapeId: string) => void;
  onGenerateTemplateRoute: (shapeId: string, targetKm?: number) => Promise<void>;
}

/** 预设图形选择页：分类浏览模板，点击即生成路线 */
export const FullLibraryScreen: React.FC<FullLibraryScreenProps> = ({
  onNavigate,
  onSelectShape,
  onGenerateTemplateRoute,
}) => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'base' | 'recommend' | 'animal' | 'text' | 'holiday'>('base');
  const [templates, setTemplates] = useState<RouteTemplateItem[]>([]);
  const tabs = FULL_LIBRARY_TABS;

  useEffect(() => {
    let cancelled = false;
    const category = activeTab === 'recommend' ? undefined : activeTab;
    listTemplates({ category, featured: activeTab === 'recommend', limit: 40 })
      .then((items) => {
        if (!cancelled) setTemplates(items);
      })
      .catch(() => {
        if (!cancelled) setTemplates([]);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  const currentItems = templates.map((item) => ({
        id: item.id,
        shapeId: templateToShapeId(item),
        title: item.title,
        bg: templateClassGradient(item.shapeType),
        icon: templateIcon(item.shapeType, 28),
        km: `约${item.distanceKm.toFixed(1)}km`,
        badge: item.isFeatured ? 'hot' : 'star',
      }));

  return (
    <div className="flex flex-col h-full bg-white select-none">
      {/* Top Title Bar */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3">
        <button onClick={() => onNavigate('home')} className="p-1 rounded-full text-gray-500 active:bg-gray-100">
          <ArrowLeft size={19} />
        </button>
        <span className="text-base font-bold text-gray-800">{t('library.select_title', '选择图形模板')}</span>
        <button className="p-1 rounded-full text-gray-500 active:bg-gray-100">
          <Search size={19} />
        </button>
      </div>

      {/* Horizontal categories list */}
      <div className="px-5 py-2">
        <div className="flex space-x-2 overflow-x-auto pb-1.5 scrollbar-none">
          {tabs.map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all shrink-0 ${
                  isSelected 
                    ? 'bg-linear-to-r from-[#4FACFE] to-[#00F2FE] text-white shadow-[0_2px_8px_rgba(79,172,254,0.3)]' 
                    : 'bg-gray-50 text-gray-500 border border-gray-100 hover:bg-gray-100'
                }`}
              >
                {t(`library.tab.${tab.id}`, tab.label)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Shapes Grid Layout */}
      <div className="flex-1 overflow-y-auto px-5 py-3">
        <div className="grid grid-cols-2 gap-4">
          {currentItems.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                selectTemplate(item.id);
                onSelectShape(item.shapeId);
                void onGenerateTemplateRoute(item.shapeId);
              }}
              className={`rounded-[24px] bg-linear-to-tr ${item.bg} p-4 h-[124px] flex flex-col justify-between text-white relative shadow-md cursor-pointer hover:scale-[1.02] active:scale-98 transition-all overflow-hidden group`}
            >
              {/* Star / Fire Badge */}
              <div className="absolute top-3 right-3">
                {item.badge === 'hot' ? (
                  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-orange-500/30 text-amber-300">
                    <Flame size={13} className="fill-amber-300 stroke-none" />
                  </div>
                ) : (
                  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-white/25">
                    <Star size={11} className="fill-white stroke-none" />
                  </div>
                )}
              </div>

              {/* Icon Container */}
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                {item.icon}
              </div>

              {/* Title & Info */}
              <div>
                <h4 className="text-[14px] font-extrabold tracking-tight leading-none">
                  {t(`library.item.${item.id}`, item.title)}
                </h4>
                <p className="text-[10px] text-white/75 mt-1">
                  {t(`library.item.${item.id}_km`, item.km)}
                </p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-gray-400 text-center mt-6">
          {t('library.footer_swipe', '滑动查看更多，支持通过AI在自定义画布中描绘。')}
        </p>
      </div>
    </div>
  );
};
