import React from 'react';
import { 
  Settings, 
  Upload, 
  Layers, 
  ChevronRight, 
  Plus, 
  Star, 
  Heart, 
  Circle, 
  Square, 
  Triangle 
} from 'lucide-react';
import { ScreenId } from '../types';
import { useI18n } from '../i18n';
import { BottomNavBar } from './common/BottomNavBar';

interface HomeScreenProps {
  onNavigate: (screen: ScreenId) => void;
  onSelectShape: (shapeId: string) => void;
  openBottomSheet: () => void;
  activeNavbarTab: 'home' | 'traces' | 'profile';
  setActiveNavbarTab: (tab: 'home' | 'traces' | 'profile') => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigate,
  onSelectShape,
  openBottomSheet,
  activeNavbarTab,
  setActiveNavbarTab,
}) => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col min-h-full bg-[linear-gradient(180deg,#f7fbff_0%,#ffffff_24%,#eef7ff_100%)] select-none relative">
      {/* Scrollable Container */}
      <div className="flex-1 overflow-y-auto pb-[calc(96px+env(safe-area-inset-bottom))]">
        
        {/* Top Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-5 pt-[calc(var(--tc-safe-top)+12px)] pb-3 bg-[linear-gradient(180deg,rgba(247,251,255,0.96)_0%,rgba(255,255,255,0.82)_100%)] backdrop-blur-xl border-b border-slate-100/60 shadow-[0_1px_0_rgba(15,23,42,0.03)]">
          <div className="w-6"></div> {/* Spacer for symmetry */}
          <h1 className="text-xl font-bold tracking-tight text-gray-900 bg-linear-to-r from-[#4FACFE] to-[#00F2FE] bg-clip-text text-transparent">
            {t('home.title', '轨迹工坊')}
          </h1>
          <button 
            id="settings_btn"
            onClick={() => onNavigate('profile')} 
            className="p-1 rounded-full text-gray-400 hover:text-gray-600 active:bg-gray-100 transition-colors"
            title={t('home.profile', '个人中心')}
          >
            <Settings size={20} />
          </button>
        </div>

        {/* Double Entry Cards */}
        <div className="grid grid-cols-2 gap-4 px-5 pt-3">
          {/* Left Card: Upload */}
          <button
            id="upload_entry_card"
            onClick={() => onNavigate('editor')}
            className="flex flex-col items-start p-4 text-left rounded-[24px] border border-gray-100 bg-linear-to-b from-white to-blue-50/20 shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:scale-102 transition-all duration-300 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-16 h-16 bg-linear-to-bl from-blue-100/30 to-teal-100/10 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform"></div>
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mb-4 text-[#4FACFE]">
              <Upload size={20} />
            </div>
            <h3 className="text-[16px] font-semibold text-gray-900 mb-1">{t('home.upload_card_title', '上传图片')}</h3>
            <p className="text-[12px] text-gray-500 mb-2 leading-tight">{t('home.upload_card_desc', '用自己的照片或图案识别')}</p>
            <span className="text-[10px] text-gray-400 mt-auto bg-gray-50 px-2 py-0.5 rounded-md">{t('home.upload_card_hint', '支持 JPG / PNG')}</span>
          </button>

          {/* Right Card: Selection */}
          <button
            id="select_shape_entry_card"
            onClick={() => onNavigate('library')}
            className="flex flex-col items-start p-4 text-left rounded-[24px] border border-gray-100 bg-linear-to-b from-white to-teal-50/20 shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:scale-102 transition-all duration-300 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-16 h-16 bg-linear-to-bl from-teal-100/30 to-blue-100/10 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform"></div>
            <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center mb-4 text-[#00F2FE]">
              <Layers size={20} />
            </div>
            <h3 className="text-[16px] font-semibold text-gray-900 mb-1">{t('home.select_shape_title', '选择图形')}</h3>
            <p className="text-[12px] text-gray-500 mb-2 leading-tight">{t('home.select_shape_desc', '使用预设模板快速开始')}</p>
            <span className="text-[10px] text-gray-400 mt-auto bg-gray-50 px-2 py-0.5 rounded-md">{t('home.select_shape_hint', '三角形/圆形/星形')}</span>
          </button>
        </div>

        {/* Hot Templates Section */}
        <div className="mt-8 px-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[14px] font-bold text-gray-800">{t('home.quick_templates', '热门模板')}</h2>
            <button 
              onClick={() => onNavigate('quick_cards')} 
              className="text-[12px] font-medium text-[#4FACFE] active:opacity-75 flex items-center"
            >
              {t('home.quick_templates_action', '查看全部')} <ChevronRight size={14} className="ml-0.5" />
            </button>
          </div>

          {/* Horizontal scrollbar of mini shape cards */}
          <div className="flex space-x-4 overflow-x-auto pb-2 scrollbar-none -mx-5 px-5">
            {/* Quick pre-sets */}
            <div 
              onClick={() => { onSelectShape('circle'); onNavigate('param_adjust'); }}
              className="flex flex-col items-center min-w-[56px] cursor-pointer"
            >
              <div className="w-11 h-11 rounded-full bg-linear-to-tr from-[#4FACFE] to-[#00F2FE] flex items-center justify-center shadow-md active:scale-95 transition-transform text-white">
                <Circle size={18} className="stroke-[2.5]" />
              </div>
              <span className="text-[10px] text-gray-700 font-medium mt-1.5">{t('shape.circle', '圆形')}</span>
              <span className="text-[9px] text-gray-400">{t('home.circle_distance', '3.5km')}</span>
            </div>

            <div 
              onClick={() => { onSelectShape('triangle'); onNavigate('param_adjust'); }}
              className="flex flex-col items-center min-w-[56px] cursor-pointer"
            >
              <div className="w-11 h-11 rounded-full bg-linear-to-tr from-orange-400 to-red-500 flex items-center justify-center shadow-md active:scale-95 transition-transform text-white">
                <Triangle size={17} className="stroke-[2.5]" />
              </div>
              <span className="text-[10px] text-gray-700 font-medium mt-1.5">{t('shape.triangle', '三角形')}</span>
              <span className="text-[9px] text-gray-400">{t('home.triangle_distance', '3.0km')}</span>
            </div>

            <div 
              onClick={() => { onSelectShape('star'); onNavigate('param_adjust'); }}
              className="flex flex-col items-center min-w-[56px] cursor-pointer"
            >
              <div className="w-11 h-11 rounded-full bg-linear-to-tr from-yellow-400 to-amber-500 flex items-center justify-center shadow-md active:scale-95 transition-transform text-white">
                <Star size={18} className="fill-white stroke-[2]" />
              </div>
              <span className="text-[10px] text-gray-700 font-medium mt-1.5">{t('shape.star', '五角星')}</span>
              <span className="text-[9px] text-gray-400">{t('home.star_distance', '5km')}</span>
            </div>

            <div 
              onClick={() => { onSelectShape('heart'); onNavigate('param_adjust'); }}
              className="flex flex-col items-center min-w-[56px] cursor-pointer"
            >
              <div className="w-11 h-11 rounded-full bg-linear-to-tr from-pink-400 to-rose-500 flex items-center justify-center shadow-md active:scale-95 transition-transform text-white">
                <Heart size={18} className="fill-white stroke-none" />
              </div>
              <span className="text-[10px] text-gray-700 font-medium mt-1.5">{t('shape.heart', '心形')}</span>
              <span className="text-[9px] text-gray-400">{t('home.heart_distance', '4.2km')}</span>
            </div>

            <div 
              onClick={() => { onSelectShape('square'); onNavigate('param_adjust'); }}
              className="flex flex-col items-center min-w-[56px] cursor-pointer"
            >
              <div className="w-11 h-11 rounded-full bg-linear-to-tr from-emerald-400 to-teal-500 flex items-center justify-center shadow-md active:scale-95 transition-transform text-white">
                <Square size={17} className="stroke-[2.5]" />
              </div>
              <span className="text-[10px] text-gray-700 font-medium mt-1.5">{t('shape.square', '正方形')}</span>
              <span className="text-[9px] text-gray-400">{t('home.square_distance', '4.0km')}</span>
            </div>

            {/* More plus card */}
            <div 
              onClick={openBottomSheet}
              className="flex flex-col items-center min-w-[56px] cursor-pointer"
            >
              <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center border border-dashed border-gray-300 text-gray-400 active:scale-95 transition-transform hover:bg-gray-200">
                <Plus size={20} />
              </div>
              <span className="text-[10px] text-gray-600 mt-1.5">{t('home.more', '更多')}</span>
              <span className="text-[9px] text-gray-400">-</span>
            </div>
          </div>
        </div>

        {/* Recently Used Records */}
        <div className="mt-8 px-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[14px] font-bold text-gray-800">{t('home.recent_title', '最近使用')}</h2>
          </div>
          
          <div className="space-y-3 bg-gray-55/40 p-1 rounded-2xl">
            {/* Quick List item with custom cat */}
            <div 
              onClick={() => { onSelectShape('heart'); onNavigate('param_adjust'); }}
              className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-gray-100 shadow-[0_2px_6px_rgba(0,0,0,0.02)] cursor-pointer active:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-full bg-pink-100 flex items-center justify-center text-pink-500 overflow-hidden text-lg">
                  🐱
                </div>
                <div>
                  <h4 className="text-[14px] font-semibold text-gray-800">{t('home.recent_cat_name', '小猫跑')}</h4>
                  <p className="text-[11px] text-gray-400">{t('home.recent_cat_desc', '上次消耗 350千卡 | 2026-06-08')}</p>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-sm font-bold text-[#4FACFE]">5km</span>
                <ChevronRight size={14} className="text-gray-300" />
              </div>
            </div>

            {/* Other static records */}
            {[
              { id: 'hist2', shapeType: 'star', icon: '⭐', title: t('home.recent_star_name', '星形极限速跑'), desc: t('home.recent_star_desc', '耗时 22:40 | 2026-05-30'), distance: '3.62km' },
              { id: 'hist3', shapeType: 'heart', icon: '❤️', title: t('home.recent_heart_name', '爱心跑表白'), desc: t('home.recent_heart_desc', '耗时 28:10 | 2026-05-24'), distance: '4.25km' },
            ].map((record) => (
              <div 
                key={record.id}
                onClick={() => { onSelectShape(record.shapeType); onNavigate('param_adjust'); }}
                className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-gray-100 shadow-[0_2px_6px_rgba(0,0,0,0.02)] cursor-pointer active:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 font-bold overflow-hidden">
                    {record.icon}
                  </div>
                  <div>
                    <h4 className="text-[14px] font-semibold text-gray-800">{record.title}</h4>
                    <p className="text-[11px] text-gray-400">{record.desc}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-sm font-bold text-[#4FACFE]">{record.distance}</span>
                  <ChevronRight size={14} className="text-gray-300" />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Bottom Nav Bar */}
      <BottomNavBar
        onNavigate={onNavigate}
        activeNavbarTab={activeNavbarTab}
        setActiveNavbarTab={setActiveNavbarTab}
      />

    </div>
  );
};

