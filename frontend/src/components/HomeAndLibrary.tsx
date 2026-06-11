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
import { historyRecords } from '../data';
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

