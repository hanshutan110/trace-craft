/**
 * ParamAdjustScreen - 参数调节界面
 *
 * 从原 NavigationAndEditor.tsx 拆分而来。
 * 功能：图形参数调节面板
 * - 缩放 (1x-3x)、旋转 (0-360°)、拉伸 (0.5-2.0) 滑块
 * - 目标距离拖拽滑块 (2-15km)
 * - 实时预览变换后的图形形状
 * - 右侧浮动滑块面板 + 底部操作栏
 *
 * @source 拆分自 components/NavigationAndEditor.tsx
 */
import React, { useState } from 'react';
import { 
  ArrowLeft, 
  RotateCw
} from 'lucide-react';
import { ScreenId } from '../../types';
import { useI18n } from '../../i18n';

interface ParamAdjustScreenProps {
  onNavigate: (screen: ScreenId) => void;
  selectedShapeId: string;
  onGenerateTemplateRoute: (shapeId: string, targetKm?: number) => Promise<void>;
}

export const ParamAdjustScreen: React.FC<ParamAdjustScreenProps> = ({ 
  onNavigate,
  selectedShapeId,
  onGenerateTemplateRoute,
}) => {
  const { t, text } = useI18n();
  const [scale, setScale] = useState(1.5);     // 1x - 3x
  const [rotate, setRotate] = useState(45);     // 0 - 360  
  const [stretch, setStretch] = useState(1.0);  // 0.5 - 2.0
  const [goalDistance, setGoalDistance] = useState(5.0); // 目标距离

  // Calculate dynamic approximate length based on scale
  const calculatedLength = (2.1 * scale * stretch).toFixed(1);

  return (
    <div className="flex flex-col h-full bg-white select-none">
      
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3 border-b border-gray-50">
        <button onClick={() => onNavigate('library')} className="p-1 rounded-full text-gray-400 active:bg-gray-100">
          <ArrowLeft size={19} />
        </button>
        <span className="text-base font-bold text-gray-800">{t('adjust.title', '图形参数调节')}</span>
        <button 
          onClick={() => { setScale(1.5); setRotate(45); setStretch(1.0); }}
          className="text-xs font-semibold text-[#4FACFE] active:opacity-75"
        >
          {t('adjust.reset', '重置')}
        </button>
      </div>

      {/* Centered Map preview container */}
      <div className="flex-1 overflow-hidden relative bg-slate-50 flex items-center justify-center p-4">
        {/* Map grid representation */}
        <div className="absolute inset-0 z-0 opacity-40">
          <svg width="100%" height="100%">
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#D1D5DB" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Vector street curves */}
        <div className="absolute inset-x-0 top-1/4 h-2 bg-white rounded-full z-0 pointer-events-none rotate-12 opacity-50"></div>
        <div className="absolute inset-y-0 left-1/3 w-2 bg-white rounded-full z-0 pointer-events-none -rotate-45 opacity-50"></div>

        {/* Interactive Shape display within transform boundaries */}
        <div 
          className="relative w-44 h-44 border-2 border-dashed border-[#4FACFE]/60 rounded-lg flex items-center justify-center group z-10 transition-all shadow-[0_4px_16px_rgba(79,172,254,0.1)] bg-white/40 backdrop-blur-xs"
        >
          {/* Active white grip points */}
          <div className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border border-[#4FACFE] rounded-full"></div>
          <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border border-[#4FACFE] rounded-full"></div>
          <div className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border border-[#4FACFE] rounded-full"></div>
          <div className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border border-[#4FACFE] rounded-full"></div>
          
          {/* Central Rotating Lever */}
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-0.5 h-10 bg-[#4FACFE]"></div>
          <div className="absolute -top-[48px] left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-[#4FACFE] flex items-center justify-center shadow-md hover:scale-110 cursor-grab text-white font-bold leading-none active:scale-95 text-xs">
            <RotateCw size={11} />
          </div>

          {/* SVG Shape component responding dynamically to state transformations */}
          <div 
            style={{ 
              transform: `scale(${scale / 1.5}) rotate(${rotate}deg) scaleX(${stretch})`,
              transition: 'transform 0.15s ease-out'
            }}
            className="w-32 h-32 flex items-center justify-center"
          >
            {selectedShapeId === 'heart' ? (
              <svg viewBox="0 0 100 100" className="w-full h-full text-orange-500 fill-orange-500/10 drop-shadow-[0_0_6px_rgba(255,107,53,0.5)]">
                <path d="M50 30 C30 -10 -5 15 50 85 C105 15 70 -10 50 30 Z" stroke="#FF6B35" strokeWidth="4" />
              </svg>
            ) : selectedShapeId === 'circle' ? (
              <svg viewBox="0 0 100 100" className="w-full h-full text-orange-500 fill-orange-500/10 drop-shadow-[0_0_6px_rgba(255,107,53,0.5)]">
                <circle cx="50" cy="50" r="38" stroke="#FF6B35" strokeWidth="4" />
              </svg>
            ) : selectedShapeId === 'triangle' ? (
              <svg viewBox="0 0 100 100" className="w-full h-full text-orange-500 fill-orange-500/10 drop-shadow-[0_0_6px_rgba(255,107,53,0.5)]">
                <polygon points="50,15 88,85 12,85" stroke="#FF6B35" strokeWidth="4" strokeLinejoin="round" />
              </svg>
            ) : selectedShapeId === 'square' ? (
              <svg viewBox="0 0 100 100" className="w-full h-full text-orange-500 fill-orange-500/10 drop-shadow-[0_0_6px_rgba(255,107,53,0.5)]">
                <rect x="15" y="15" width="70" height="70" rx="8" stroke="#FF6B35" strokeWidth="4" />
              </svg>
            ) : (
              // Default FIVE POINTED STAR
              <svg viewBox="0 0 100 100" className="w-full h-full text-[#FF6B35] fill-orange-500/10 drop-shadow-[0_0_6px_rgba(255,107,53,0.5)]">
                <polygon 
                  points="50,12 63,38 92,42 71,62 76,90 50,77 24,90 29,62 8,42 37,38"
                  stroke="#FF6B35" 
                  strokeWidth="4" 
                  strokeLinejoin="round" 
                />
              </svg>
            )}
          </div>
        </div>

        {/* Right floating adjustment slider dashboard panels */}
        <div className="absolute right-3 top-12 bottom-12 w-[64px] bg-white/70 backdrop-blur-md rounded-2xl p-2.5 border border-white/20 shadow-xs flex flex-col justify-around z-20">
          {/* Slider 1: Scale */}
          <div className="flex flex-col items-center">
            <span className="text-[9px] font-bold text-gray-500">{t('adjust.scale_label', '大小')}</span>
            <div className="relative h-18 my-1 cursor-grab flex items-center justify-center">
              <input 
                type="range" 
                min="1" 
                max="3" 
                step="0.1"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="accent-[#4FACFE] h-1.5 rounded-lg appearance-none cursor-pointer w-16 -rotate-90 vertical-range"
              />
            </div>
            <span className="text-[10px] font-mono text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">{scale.toFixed(1)}x</span>
          </div>

          {/* Slider 2: Rotate */}
          <div className="flex flex-col items-center">
            <span className="text-[9px] font-bold text-gray-500">{t('adjust.rotate_label', '旋转')}</span>
            <div className="relative h-18 my-1 flex items-center justify-center">
              <input 
                type="range" 
                min="0" 
                max="360" 
                step="5"
                value={rotate}
                onChange={(e) => setRotate(parseInt(e.target.value))}
                className="accent-[#4FACFE] h-1.5 rounded-lg appearance-none cursor-pointer w-16 -rotate-90 vertical-range"
              />
            </div>
            <span className="text-[9px] font-mono text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">{rotate}°</span>
          </div>

          {/* Slider 3: Stretch */}
          <div className="flex flex-col items-center">
            <span className="text-[9px] font-bold text-gray-500">{t('adjust.stretch_label', '拉伸')}</span>
            <div className="relative h-18 my-1 flex items-center justify-center">
              <input 
                type="range" 
                min="0.5" 
                max="2" 
                step="0.1"
                value={stretch}
                onChange={(e) => setStretch(parseFloat(e.target.value))}
                className="accent-[#4FACFE] h-1.5 rounded-lg appearance-none cursor-pointer w-16 -rotate-90 vertical-range"
              />
            </div>
            <span className="text-[9px] font-mono text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">{stretch.toFixed(1)}x</span>
          </div>
        </div>
      </div>

      {/* Lower length hud and confirm actions */}
      <div className="bg-white px-5 py-4 border-t border-gray-100 flex flex-col space-y-3">
        {/* Length markers and goals */}
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-gray-500">
            {text('预计长度', 'Estimated Length')}: <strong className="text-gray-800 font-extrabold">{calculatedLength} km</strong>
          </span>
          <span className="text-[11px] text-teal-600 font-semibold bg-teal-50 px-2 py-0.5 rounded-full">
            {text('1:1 等比匹配', '1:1 proportional match')}
          </span>
        </div>

        {/* Draggable Target Distance Slider */}
        <div className="bg-gray-50/50 p-2.5 rounded-xl border border-gray-100">
          <div className="flex justify-between text-[11px] text-gray-400 mb-1">
            <span>{t('adjust.goal_label', '目标距离')}</span>
            <span className="text-[#4FACFE] font-bold">{goalDistance.toFixed(1)} km</span>
          </div>
          <input 
            type="range" 
            min="2.0" 
            max="15.0" 
            step="0.5"
            value={goalDistance}
            onChange={(e) => setGoalDistance(parseFloat(e.target.value))}
            className="w-full accent-[#4FACFE] h-1.5 rounded-lg appearance-none cursor-pointer bg-gray-200"
          />
        </div>

        {/* Apply & Navigate */}
        <button
          onClick={() => void onGenerateTemplateRoute(selectedShapeId, goalDistance)}
          className="w-full py-3.5 rounded-[32px] bg-linear-to-r from-[#4FACFE] to-[#00F2FE] hover:brightness-105 active:scale-98 transition-all text-white font-extrabold text-[15px] shadow-md shadow-blue-500/20 text-center"
        >
          {text('应用并开始导航', 'Apply and Start Navigation')}
        </button>
      </div>

    </div>
  );
};
