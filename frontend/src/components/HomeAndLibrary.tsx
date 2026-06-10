import React, { useState } from 'react';
import { 
  Settings, 
  Upload, 
  Layers, 
  ChevronRight, 
  Plus, 
  Search, 
  ArrowLeft, 
  Star, 
  Flame, 
  Heart, 
  Circle, 
  Square, 
  Triangle 
} from 'lucide-react';
import { ScreenId } from '../types';
import { historyRecords } from '../data';
import { BottomNavBar } from './common/BottomNavBar';

const QUICK_TEMPLATE_CARDS = [
  {
    id: 'heart',
    title: '爱心路线',
    distance: '约4.2km',
    gradient: 'linear-gradient(135deg, #FF758C 0%, #FF7EB3 100%)',
    icon: <Heart size={44} className="fill-white stroke-none text-white/90" />,
    tagColor: 'bg-rose-500/20 text-white'
  },
  {
    id: 'star',
    title: '星形挑战',
    distance: '约5km',
    gradient: 'linear-gradient(135deg, #FFD166 0%, #FFB347 100%)',
    icon: <Star size={44} className="fill-white stroke-none text-white/95" />,
    tagColor: 'bg-amber-600/20 text-white'
  },
  {
    id: 'circle',
    title: '环湖路线',
    distance: '约3.5km',
    gradient: 'linear-gradient(135deg, #4FACFE 0%, #00F2FE 100%)',
    icon: <Circle size={40} className="stroke-[3.5] text-white" />,
    tagColor: 'bg-blue-600/20 text-white'
  },
  {
    id: 'triangle',
    title: '三角冲刺',
    distance: '约3km',
    gradient: 'linear-gradient(135deg, #FF6B6B 0%, #EE5A24 100%)',
    icon: <Triangle size={40} className="stroke-[3.5] text-white" />,
    tagColor: 'bg-red-650/20 text-white'
  },
  {
    id: 'square',
    title: '方形地图',
    distance: '约4km',
    gradient: 'linear-gradient(135deg, #A8E6CF 0%, #3BAC6A 100%)',
    icon: <Square size={40} className="stroke-[3.5] text-white" />,
    tagColor: 'bg-emerald-650/15 text-white'
  }
];

const FULL_LIBRARY_TABS = [
  { id: 'recommend', label: '推荐' },
  { id: 'base', label: '基础图形' },
  { id: 'animal', label: '动物' },
  { id: 'text', label: '文字' },
  { id: 'holiday', label: '节日' },
] as const;

const FULL_LIBRARY_GRID_ITEMS = [
  {
    id: 'circle',
    title: '圆形',
    bg: 'from-[#FF6B6B] to-[#FF8E53]',
    icon: <Circle size={28} className="stroke-[3] text-white" />,
    km: '约3.5km',
    badge: 'star'
  },
  {
    id: 'triangle',
    title: '三角形',
    bg: 'from-[#FF9F43] to-[#FFC575]',
    icon: <Triangle size={28} className="stroke-[3] text-white" />,
    km: '约3.0km',
    badge: 'star'
  },
  {
    id: 'star',
    title: '五角星',
    bg: 'from-[#FFD166] to-[#FFB347]',
    icon: <Star size={28} className="fill-white stroke-none text-white/95" />,
    km: '约5km',
    badge: 'hot'
  },
  {
    id: 'square',
    title: '正方形',
    bg: 'from-[#3BAC6A] to-[#68D391]',
    icon: <Square size={28} className="stroke-[3] text-white" />,
    km: '约4公里',
    badge: 'star'
  },
  {
    id: 'heart',
    title: '心形',
    bg: 'from-[#FF758C] to-[#FF7EB3]',
    icon: <Heart size={28} className="fill-white stroke-none text-white/95" />,
    km: '约4.2km',
    badge: 'hot'
  },
  {
    id: 'hexagon',
    title: '六边形',
    bg: 'from-[#A29BFE] to-[#6C5CE7]',
    icon: <span className="font-bold text-white text-base">六</span>,
    km: '约4.8km',
    badge: 'star'
  }
] as const;

const FULL_LIBRARY_VARIANT_ITEMS = {
  animal: [
    { id: 'cat', title: '小猫路线', bg: 'from-blue-400 to-indigo-500', icon: <span className="text-2xl">🐱</span>, km: '5.1km', badge: 'hot' },
    { id: 'panda', title: '熊猫脚印', bg: 'from-gray-700 to-slate-900', icon: <span className="text-2xl">🐼</span>, km: '6.5km', badge: 'star' },
  ],
  text: [
    { id: 'love', title: 'LOVE字母', bg: 'from-pink-500 to-rose-400', icon: <span className="font-sans font-black text-xl text-white">L-O-V-E</span>, km: '8.2km', badge: 'hot' },
    { id: 'star_t', title: 'RUN', bg: 'from-orange-400 to-red-500', icon: <span className="font-sans font-black text-xl text-white">R-U-N</span>, km: '4.5km', badge: 'star' },
  ],
  holiday: [
    { id: 'tree', title: '圣诞树', bg: 'from-green-600 to-emerald-800', icon: <span className="text-2xl">🎄</span>, km: '6.4km', badge: 'star' },
    { id: 'moon', title: '中秋圆月', bg: 'from-amber-300 to-orange-400', icon: <span className="text-2xl">🌙</span>, km: '3.8km', badge: 'hot' },
  ],
} as const;

const getLibraryItems = (activeTab: 'base' | 'recommend' | 'animal' | 'text' | 'holiday') => {
  if (activeTab === 'recommend') {
    return FULL_LIBRARY_GRID_ITEMS.filter((item) => item.badge === 'hot');
  }

  if (activeTab === 'animal' || activeTab === 'text' || activeTab === 'holiday') {
    return FULL_LIBRARY_VARIANT_ITEMS[activeTab];
  }

  return FULL_LIBRARY_GRID_ITEMS;
};

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
  // Simple search placeholder or interactive states
  return (
    <div className="flex flex-col h-full bg-white select-none relative">
      {/* Scrollable Container */}
      <div className="flex-1 overflow-y-auto pb-20">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div className="w-6"></div> {/* Spacer for symmetry */}
          <h1 className="text-xl font-bold tracking-tight text-gray-900 bg-linear-to-r from-[#4FACFE] to-[#00F2FE] bg-clip-text text-transparent">
            轨迹工坊
          </h1>
          <button 
            id="settings_btn"
            onClick={() => onNavigate('profile')} 
            className="p-1 rounded-full text-gray-400 hover:text-gray-600 active:bg-gray-100 transition-colors"
            title="个人中心"
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
            <h3 className="text-[16px] font-semibold text-gray-900 mb-1">上传图片</h3>
            <p className="text-[12px] text-gray-500 mb-2 leading-tight">用自己的照片或图案识别</p>
            <span className="text-[10px] text-gray-400 mt-auto bg-gray-50 px-2 py-0.5 rounded-md">支持 JPG / PNG</span>
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
            <h3 className="text-[16px] font-semibold text-gray-900 mb-1">选择图形</h3>
            <p className="text-[12px] text-gray-500 mb-2 leading-tight">使用预设模板快速开始</p>
            <span className="text-[10px] text-gray-400 mt-auto bg-gray-50 px-2 py-0.5 rounded-md">三角形/圆形/星形</span>
          </button>
        </div>

        {/* Hot Templates Section */}
        <div className="mt-8 px-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[14px] font-bold text-gray-800">热门模板</h2>
            <button 
              onClick={() => onNavigate('quick_cards')} 
              className="text-[12px] font-medium text-[#4FACFE] active:opacity-75 flex items-center"
            >
              查看全部 <ChevronRight size={14} className="ml-0.5" />
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
              <span className="text-[10px] text-gray-700 font-medium mt-1.5">圆形</span>
              <span className="text-[9px] text-gray-400">3.5km</span>
            </div>

            <div 
              onClick={() => { onSelectShape('triangle'); onNavigate('param_adjust'); }}
              className="flex flex-col items-center min-w-[56px] cursor-pointer"
            >
              <div className="w-11 h-11 rounded-full bg-linear-to-tr from-orange-400 to-red-500 flex items-center justify-center shadow-md active:scale-95 transition-transform text-white">
                <Triangle size={17} className="stroke-[2.5]" />
              </div>
              <span className="text-[10px] text-gray-700 font-medium mt-1.5">三角形</span>
              <span className="text-[9px] text-gray-400">3.0km</span>
            </div>

            <div 
              onClick={() => { onSelectShape('star'); onNavigate('param_adjust'); }}
              className="flex flex-col items-center min-w-[56px] cursor-pointer"
            >
              <div className="w-11 h-11 rounded-full bg-linear-to-tr from-yellow-400 to-amber-500 flex items-center justify-center shadow-md active:scale-95 transition-transform text-white">
                <Star size={18} className="fill-white stroke-[2]" />
              </div>
              <span className="text-[10px] text-gray-700 font-medium mt-1.5">五角星</span>
              <span className="text-[9px] text-gray-400">5km</span>
            </div>

            <div 
              onClick={() => { onSelectShape('heart'); onNavigate('param_adjust'); }}
              className="flex flex-col items-center min-w-[56px] cursor-pointer"
            >
              <div className="w-11 h-11 rounded-full bg-linear-to-tr from-pink-400 to-rose-500 flex items-center justify-center shadow-md active:scale-95 transition-transform text-white">
                <Heart size={18} className="fill-white stroke-none" />
              </div>
              <span className="text-[10px] text-gray-700 font-medium mt-1.5">心形</span>
              <span className="text-[9px] text-gray-400">4.2km</span>
            </div>

            <div 
              onClick={() => { onSelectShape('square'); onNavigate('param_adjust'); }}
              className="flex flex-col items-center min-w-[56px] cursor-pointer"
            >
              <div className="w-11 h-11 rounded-full bg-linear-to-tr from-emerald-400 to-teal-500 flex items-center justify-center shadow-md active:scale-95 transition-transform text-white">
                <Square size={17} className="stroke-[2.5]" />
              </div>
              <span className="text-[10px] text-gray-700 font-medium mt-1.5">正方形</span>
              <span className="text-[9px] text-gray-400">4.0km</span>
            </div>

            {/* More plus card */}
            <div 
              onClick={openBottomSheet}
              className="flex flex-col items-center min-w-[56px] cursor-pointer"
            >
              <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center border border-dashed border-gray-300 text-gray-400 active:scale-95 transition-transform hover:bg-gray-200">
                <Plus size={20} />
              </div>
              <span className="text-[10px] text-gray-600 mt-1.5">更多</span>
              <span className="text-[9px] text-gray-400">-</span>
            </div>
          </div>
        </div>

        {/* Recently Used Records */}
        <div className="mt-8 px-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[14px] font-bold text-gray-800">最近使用</h2>
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
                  <h4 className="text-[14px] font-semibold text-gray-800">小猫跑</h4>
                  <p className="text-[11px] text-gray-400">上次消耗 350千卡 | 2026-06-08</p>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-sm font-bold text-[#4FACFE]">5km</span>
                <ChevronRight size={14} className="text-gray-300" />
              </div>
            </div>

            {/* Other static records */}
            {historyRecords.slice(1).map((record) => (
              <div 
                key={record.id}
                onClick={() => { onSelectShape(record.shapeType); onNavigate('param_adjust'); }}
                className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-gray-100 shadow-[0_2px_6px_rgba(0,0,0,0.02)] cursor-pointer active:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 font-bold overflow-hidden">
                    {record.shapeType === 'star' ? '⭐' : '❤️'}
                  </div>
                  <div>
                    <h4 className="text-[14px] font-semibold text-gray-800">{record.name}</h4>
                    <p className="text-[11px] text-gray-400">耗时 {record.time} | {record.date}</p>
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


/* ==========================================
   Screen 8: Quick Presets (快速模板卡片页)
   ========================================== */
interface QuickTemplateScreenProps {
  onNavigate: (screen: ScreenId) => void;
  onSelectShape: (shapeId: string) => void;
}

export const QuickTemplateScreen: React.FC<QuickTemplateScreenProps> = ({
  onNavigate,
  onSelectShape,
}) => {
  const cards = QUICK_TEMPLATE_CARDS;

  return (
    <div className="flex flex-col h-full bg-white select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3 border-b border-gray-50">
        <button onClick={() => onNavigate('home')} className="p-1 rounded-full text-gray-500 active:bg-gray-100">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-base font-bold text-gray-900">快速模板</h1>
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
                  onSelectShape(card.id);
                  onNavigate('param_adjust');
                }}
                style={{ background: card.gradient }}
                className="min-w-[144px] w-[144px] h-[168px] rounded-[24px] p-4 flex flex-col justify-between text-white shadow-[0_6px_16px_rgba(0,0,0,0.06)] cursor-pointer active:scale-98 transition-all hover:brightness-105"
              >
                <div className="w-12 h-12 flex items-center justify-center mb-2">
                  {card.icon}
                </div>
                <div>
                  <h3 className="text-[14px] font-bold tracking-tight">{card.title}</h3>
                  <p className="text-[10px] text-white/80 mt-0.5">{card.distance}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recently Used Block */}
        <div>
          <h2 className="text-[14px] font-bold text-gray-800 mb-3">最近经常完成</h2>
          <div className="flex space-x-3">
            <div className="flex items-center space-x-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100">
              <div className="w-7 h-7 rounded-full bg-pink-100 flex items-center justify-center text-xs">💖</div>
              <div className="text-left">
                <p className="text-xs font-bold text-gray-800 leading-none">心形</p>
                <p className="text-[9px] text-[#4FACFE] mt-0.5">3次跑步</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100">
              <div className="w-7 h-7 rounded-full bg-yellow-100 flex items-center justify-center text-xs">⭐</div>
              <div className="text-left">
                <p className="text-xs font-bold text-gray-800 leading-none">五角星</p>
                <p className="text-[9px] text-[#4FACFE] mt-0.5">2次跑步</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100">
              <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs">🌀</div>
              <div className="text-left">
                <p className="text-xs font-bold text-gray-800 leading-none">环湖</p>
                <p className="text-[9px] text-[#4FACFE] mt-0.5">4次跑步</p>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Button Accent */}
        <button
          onClick={() => onNavigate('editor')}
          className="w-full flex items-center justify-center space-x-2 border-2 border-dashed border-gray-200 hover:border-[#4FACFE] py-4 rounded-2xl text-gray-500 hover:text-[#4FACFE] font-medium transition-colors bg-gray-50/50 mt-4"
        >
          <Plus size={18} />
          <span className="text-[13px]">上传自定义图片</span>
        </button>

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
}

export const FullLibraryScreen: React.FC<FullLibraryScreenProps> = ({
  onNavigate,
  onSelectShape,
}) => {
  const [activeTab, setActiveTab] = useState<'base' | 'recommend' | 'animal' | 'text' | 'holiday'>('base');
  const tabs = FULL_LIBRARY_TABS;

  const currentItems = getLibraryItems(activeTab);

  return (
    <div className="flex flex-col h-full bg-white select-none">
      {/* Top Title Bar */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3">
        <button onClick={() => onNavigate('home')} className="p-1 rounded-full text-gray-500 active:bg-gray-100">
          <ArrowLeft size={19} />
        </button>
        <span className="text-base font-bold text-gray-800">选择图形模板</span>
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
                {tab.label}
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
                // Keep star logic if it maps correctly
                const shapeId = ['circle','triangle','star','square','heart','hexagon'].includes(item.id) ? item.id : 'star';
                onSelectShape(shapeId);
                onNavigate('param_adjust');
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
                <h4 className="text-[14px] font-extrabold tracking-tight leading-none">{item.title}</h4>
                <p className="text-[10px] text-white/75 mt-1">{item.km}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-gray-400 text-center mt-6">
          滑动查看更多，支持通过AI在自定义画布中描绘。
        </p>
      </div>
    </div>
  );
};
