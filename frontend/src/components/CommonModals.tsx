import React, { useState, useEffect } from 'react';
import {
  Check,
  ArrowRight,
  Download,
  Share2,
  Heart,
  Star,
  Circle,
  Square,
  Triangle,
  Plus,
} from 'lucide-react';
import { ScreenId } from '../types';

/* ==========================================
   Screen 3: Success Share Screen (轨迹生成成功页)
   ========================================== */
interface SuccessScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

export const SuccessScreen: React.FC<SuccessScreenProps> = ({ onNavigate }) => {
  // Simulate particles representing colorful paper confetti drop
  const confettiParticles = Array.from({ length: 48 }).map((_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * -100}px`,
    delay: `${Math.random() * 2}s`,
    color: ['#FF6B35', '#4FACFE', '#00F2FE', '#10B981', '#F59E0B', '#EC4899'][i % 6],
    size: Math.random() * 8 + 4,
    rotation: `${Math.random() * 360}deg`,
  }));

  return (
    <div className="flex flex-col h-full bg-white select-none relative overflow-hidden">
      
      {/* Confetti particles waterfall overlay */}
      <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
        {confettiParticles.map((p) => (
          <div
            key={p.id}
            style={{
              left: p.left,
              animation: `confetti-fall 3.5s ease-out infinite`,
              animationDelay: p.delay,
              backgroundColor: p.color,
              width: `${p.size}px`,
              height: `${p.size}px`,
              transform: `rotate(${p.rotation})`,
              borderRadius: p.id % 3 === 0 ? '50%' : '2px',
            }}
            className="absolute top-0 opacity-80"
          />
        ))}
      </div>

      <style>{`
        @keyframes confetti-fall {
          0% { top: -20px; transform: rotate(0deg) translateX(0); opacity: 1; }
          40% { transform: rotate(180deg) translateX(15px); }
          100% { top: 410px; transform: rotate(360deg) translateX(-15px); opacity: 0; }
        }
      `}</style>

      {/* Main content scroll container */}
      <div className="flex-1 overflow-y-auto px-5 pt-8 pb-4">
        
        {/* Celebrity text */}
        <div className="text-center mb-6">
          <span className="text-4xl">🏆</span>
          <h1 className="text-xl font-black mt-2 text-gray-800">恭喜完成！</h1>
          <p className="text-[12px] text-gray-400 mt-1">你已经成功跑出既定轨迹图案</p>
        </div>

        {/* Left and Right Contrast layout */}
        <div className="flex items-center justify-between mb-6">
          
          {/* Left card */}
          <div className="w-[45%] rounded-2xl bg-white border border-gray-100 p-3 text-center shadow-xs">
            <span className="text-[10px] text-gray-400 font-bold block mb-1">你的设计</span>
            
            {/* Design thumbnail */}
            <div className="bg-gray-50 h-20 rounded-xl flex items-center justify-center p-2 mb-2">
              <svg viewBox="0 0 100 100" className="w-12 h-12 text-[#4FACFE] fill-blue-500/10">
                <polygon 
                  points="50,12 63,38 92,42 71,62 76,90 50,77 24,90 29,62 8,42 37,38"
                  stroke="currentColor" 
                  strokeWidth="6" 
                  strokeLinejoin="round" 
                />
              </svg>
            </div>
            <span className="text-xs font-bold text-gray-700">规划 5.0km</span>
          </div>

          <div className="text-[#00F2FE]">
            <ArrowRight size={20} className="animate-pulse" />
          </div>

          {/* Right card */}
          <div className="w-[45%] rounded-2xl bg-white border border-gray-100 p-3 text-center shadow-xs">
            <span className="text-[10px] text-gray-400 font-bold block mb-1">你的成果</span>
            
            {/* Result thumbnail with green run track */}
            <div className="bg-gray-50 h-20 rounded-xl flex items-center justify-center p-2 mb-2 relative overflow-hidden">
              <svg viewBox="0 0 100 100" className="w-12 h-12 text-emerald-500 fill-emerald-500/5">
                <polygon 
                  points="50,11 65,39 94,40 70,61 74,92 50,75 22,91 27,61 6,43 38,39"
                  stroke="currentColor" 
                  strokeWidth="6.5" 
                  strokeLinejoin="round" 
                />
              </svg>
            </div>
            <span className="text-xs font-bold text-gray-700">实际 5.12km</span>
          </div>

        </div>

        {/* Lower gradient stats card */}
        <div className="bg-linear-to-r from-[#4FACFE] to-[#00F2FE] rounded-[24px] p-5 text-white shadow-md text-left">
          <div className="flex items-center justify-between border-b border-white/20 pb-3 mb-3">
            <div>
              <p className="text-[10px] text-white/70 block leading-tight font-bold">总距离</p>
              <h3 className="text-lg font-black mt-0.5">5.01 km</h3>
            </div>
            <div>
              <p className="text-[10px] text-white/70 block leading-tight font-bold">用时</p>
              <h3 className="text-lg font-black mt-0.5">32: 15</h3>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-white/70 block leading-none font-bold">平均配速</p>
              <p className="text-[13px] font-extrabold mt-1">6'27" /km</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-white/70 block leading-none font-bold">准确率得分</p>
              <p className="text-[13px] font-extrabold mt-1">🎯 94%</p>
            </div>
          </div>
        </div>

        {/* Social Share Buttons */}
        <div className="mt-6 text-center">
          <p className="text-[11px] text-gray-400 font-semibold mb-3">分享到社交平台解锁勋章</p>
          <div className="flex justify-around px-2 mb-5">
            {/* WeChat */}
            <div className="flex flex-col items-center">
              <button className="w-10 h-10 rounded-full bg-[#10B981] text-white flex items-center justify-center text-xs font-bold active:scale-90 transition-transform shadow-xs">
                微
              </button>
              <span className="text-[9px] text-gray-400 mt-1">微信</span>
            </div>

            {/* Red / Xiaohongshu */}
            <div className="flex flex-col items-center">
              <button className="w-10 h-10 rounded-full bg-[#EF4444] text-white flex items-center justify-center text-xs font-bold active:scale-90 transition-transform shadow-xs">
                书
              </button>
              <span className="text-[9px] text-gray-400 mt-1">小红书</span>
            </div>

            {/* Douyin */}
            <div className="flex flex-col items-center">
              <button className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold active:scale-90 transition-transform shadow-xs">
                音
              </button>
              <span className="text-[9px] text-gray-400 mt-1">抖音</span>
            </div>

            {/* WeChat Moments */}
            <div className="flex flex-col items-center">
              <button className="w-10 h-10 rounded-full bg-[#3B82F6] text-white flex items-center justify-center text-xs font-bold active:scale-90 transition-transform shadow-xs">
                圈
              </button>
              <span className="text-[9px] text-gray-400 mt-1">朋友圈</span>
            </div>

            {/* Strava */}
            <div className="flex flex-col items-center">
              <button className="w-10 h-10 rounded-full bg-[#F97316] text-white flex items-center justify-center text-xs font-bold active:scale-90 transition-transform shadow-xs">
                St
              </button>
              <span className="text-[9px] text-gray-400 mt-1">Strava</span>
            </div>
          </div>

          {/* Album & GPX Export triggers */}
          <div className="flex justify-center space-x-6">
            <button className="text-[12px] font-bold text-[#4FACFE] active:opacity-75 flex items-center space-x-0.5 hover:underline">
              <Download size={13} />
              <span>保存到相册</span>
            </button>
            <button className="text-[12px] font-bold text-[#4FACFE] active:opacity-75 flex items-center space-x-0.5 hover:underline">
              <Share2 size={13} />
              <span>导出 GPX 文件</span>
            </button>
          </div>
        </div>

      </div>

      {/* Return home absolute footer button */}
      <div className="p-4 border-t border-gray-100 bg-white">
        <button
          onClick={() => onNavigate('home')}
          className="w-full py-3 bg-linear-to-r from-gray-100 to-gray-200 text-gray-800 hover:brightness-95 font-bold text-xs rounded-full shadow-xs active:scale-98 transition-transform"
        >
          返回首页健康
        </button>
      </div>

    </div>
  );
};


/* ==========================================
   Screen 6: Shapes Selection Drawer BottomSheet (图形选择弹窗)
   ========================================== */
interface BottomSheetModalProps {
  onClose: () => void;
  onSelect: (shapeId: string) => void;
  selectedShapeId: string;
}

export const BottomSheetModal: React.FC<BottomSheetModalProps> = ({
  onClose,
  onSelect,
  selectedShapeId,
}) => {
  const shapes = [
    { id: 'circle', name: '圆形', color: 'bg-blue-500', icon: <Circle size={22} className="stroke-[3.5] text-white" /> },
    { id: 'triangle', name: '三角形', color: 'bg-rose-500', icon: <Triangle size={22} className="stroke-[3.5] text-white" /> },
    { id: 'square', name: '正方形', color: 'bg-emerald-500', icon: <Square size={22} className="stroke-[3.5] text-white" /> },
    { id: 'star', name: '五角星', color: 'bg-amber-400', icon: <Star size={22} className="fill-white stroke-none text-white" /> },
    { id: 'heart', name: '心形', color: 'bg-pink-500', icon: <Heart size={21} className="fill-white stroke-none text-white" /> },
    { id: 'custom', name: '自定义', color: 'bg-gray-400', icon: <Plus size={22} className="text-white" /> },
  ];

  return (
    <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-xs flex flex-col justify-end">
      {/* Tap outside to dismiss helper */}
      <div className="flex-1" onClick={onClose}></div>

      {/* Actual rising modal list drawer */}
      <div className="bg-white/95 backdrop-blur-md rounded-t-[24px] px-5 pt-3 pb-8 shadow-2xl relative animate-slide-up">
        {/* Draw Line Drag Handle */}
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto my-2.5"></div>
        
        {/* Title */}
        <div className="text-center mb-5">
          <h2 className="text-base font-bold text-gray-800">选择图形模板</h2>
          <p className="text-[10px] text-gray-400 mt-0.5">请快速选定您要用于跑出的轮廓</p>
        </div>

        {/* Horizontal Slide lists of 6 items */}
        <div className="flex space-x-3.5 overflow-x-auto pb-4 scrollbar-none mb-4 -mx-1 px-1">
          {shapes.map((item) => {
            const isSelected = selectedShapeId === item.id;
            return (
              <div
                key={item.id}
                onClick={() => onSelect(item.id)}
                className="flex flex-col items-center min-w-[62px] cursor-pointer group"
              >
                {/* Active circle frame */}
                <div 
                  className={`w-13 h-13 rounded-full flex items-center justify-center relative shadow-sm transition-all ${item.color} ${
                    isSelected ? 'ring-3 ring-[#4FACFE] ring-offset-2 scale-105' : 'hover:scale-102 active:scale-95'
                  }`}
                >
                  {item.icon}
                  {/* Select check badge */}
                  {isSelected && (
                    <div className="absolute -bottom-1 -right-1 w-4.5 h-4.5 bg-[#4FACFE] rounded-full flex items-center justify-center border-2 border-white">
                      <Check size={9} className="text-white stroke-[3.5]" />
                    </div>
                  )}
                </div>
                <span className={`text-[12px] mt-2 font-medium ${isSelected ? 'text-[#4FACFE] font-bold' : 'text-gray-500'}`}>
                  {item.name}
                </span>
              </div>
            );
          })}
        </div>

        {/* Buttons flow */}
        <div className="flex flex-col space-y-2">
          <button
            onClick={() => {
              onClose();
            }}
            className="w-full py-3 rounded-[32px] bg-linear-to-r from-[#4FACFE] to-[#00F2FE] text-white font-extrabold text-[14px] shadow-md shadow-blue-500/10 active:scale-98 transition-transform"
          >
            确认选择
          </button>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-[32px] text-gray-400 font-semibold text-[13px] hover:text-gray-600 active:scale-95 transition-all text-center"
          >
            取消
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
};


/* ==========================================
   Screen 9: AI Processing Loading Screen (图形生成中/加载界面)
   ========================================== */
interface LoadingScreenProps {
  onNavigate: (screen: ScreenId) => void;
  selectedShapeId: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  onNavigate,
  selectedShapeId,
}) => {
  const [percent, setPercent] = useState(0);

  // Load progress counting simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setPercent((prev) => {
        if (prev >= 75) {
          clearInterval(timer);
          return 75; // Stayed target at 75% as per UI prompt specification
        }
        return prev + 5;
      });
    }, 120);
    return () => clearInterval(timer);
  }, []);

  const shapeTitle = selectedShapeId === 'heart' ? '爱心' : selectedShapeId === 'circle' ? '圆形' : selectedShapeId === 'triangle' ? '三角形' : selectedShapeId === 'square' ? '正方形' : '五角星';

  return (
    <div className="flex flex-col h-full bg-white select-none relative overflow-hidden">
      
      {/* Blurred background map mock */}
      <div className="absolute inset-0 z-0 opacity-40 blur-md pointer-events-none">
        <svg width="100%" height="100%" viewBox="0 0 250 400" className="object-cover scale-110">
          <rect width="250" height="400" fill="#F3F4F6" />
          <line x1="20" y1="50" x2="220" y2="350" stroke="#E5E7EB" strokeWidth="8" />
          <line x1="220" y1="50" x2="20" y2="350" stroke="#E5E7EB" strokeWidth="8" />
          <polygon points="125,120 160,180 80,180" stroke="#D1D5DB" strokeWidth="3" fill="none" />
        </svg>
      </div>

      {/* Main Card alignment */}
      <div className="flex-1 flex flex-col justify-between p-5 z-10">
        
        {/* Back and Progress text */}
        <div className="text-center pt-8">
          <h2 className="text-[16px] font-bold text-gray-700 animate-pulse">
            正在生成{shapeTitle}轨迹...
          </h2>
          <p className="text-[11px] text-gray-400 mt-1">AI 正在深度拟合街区路网与最优海拔斜率</p>
        </div>

        {/* Circular Loading Spinner (diameter 80px) */}
        <div className="flex flex-col items-center my-auto">
          <div className="relative w-24 h-24 mb-6">
            
            {/* Background progress track */}
            <svg className="w-full h-full -rotate-90">
              <circle
                cx="48"
                cy="48"
                r="36"
                stroke="#E5E7EB"
                strokeWidth="6"
                fill="none"
              />
              {/* Foreground blue-teal gradient progress overlay */}
              <circle
                cx="48"
                cy="48"
                r="36"
                stroke="url(#progress-gradient)"
                strokeWidth="6"
                fill="none"
                strokeDasharray={226}
                strokeDashoffset={226 - (226 * percent) / 100}
                strokeLinecap="round"
                className="transition-all duration-300 ease-out"
              />
              <defs>
                <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#4FACFE" />
                  <stop offset="100%" stopColor="#00F2FE" />
                </linearGradient>
              </defs>
            </svg>

            {/* Inner Star transformation icon indicator (turning from dashed outline to solid) */}
            <div className="absolute inset-0 flex items-center justify-center">
              {percent < 60 ? (
                <svg viewBox="0 0 100 100" className="w-9 h-9 text-gray-300 animate-pulse">
                  <polygon 
                    points="50,12 63,38 92,42 71,62 76,90 50,77 24,90 29,62 8,42 37,38"
                    stroke="currentColor" 
                    strokeWidth="3" 
                    fill="none" 
                    strokeDasharray="4 4"
                  />
                </svg>
              ) : (
                <svg viewBox="0 0 100 100" className="w-9 h-9 text-[#4FACFE] animate-bounce">
                  <polygon 
                    points="50,12 63,38 92,42 71,62 76,90 50,77 24,90 29,62 8,42 37,38"
                    stroke="currentColor" 
                    strokeWidth="3" 
                    fill="currentColor" 
                    fillOpacity="0.1" 
                  />
                </svg>
              )}
            </div>

            {/* Percent numeric tag */}
            <div className="absolute -bottom-1 bg-gray-900 text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shadow-xs">
              {percent}%
            </div>
          </div>

          {/* Running Person Animated GIF fallback (horizontal looping dot) */}
          <div className="w-24 bg-gray-100 rounded-full h-1.5 overflow-hidden relative mb-2.5">
            <div className="absolute w-4 h-full bg-[#4FACFE] rounded-full animate-runner-indicator"></div>
          </div>
          <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider flex items-center space-x-1">
            <span>🏃‍♂️</span>
            <span>正在自动路书寻航...</span>
          </span>
        </div>

        {/* Lower guidelines */}
        <div className="text-center">
          <div className="bg-gray-50 border border-gray-100 p-3 rounded-2xl text-left max-w-[210px] mx-auto mb-4">
            <p className="text-[12px] text-gray-700 font-bold leading-none mb-1.5 flex items-center space-x-1">
              <span>🎯</span> 
              <span>轨迹长度: 5.0公里</span>
            </p>
            <p className="text-[11px] text-gray-400">预计耗时: 约30分钟跑完 (配速6:00)</p>
          </div>

          {/* Cancel button trigger */}
          <button
            onClick={() => onNavigate('home')}
            className="px-4 py-2 bg-gray-100 active:bg-gray-200 border border-gray-200 text-gray-500 text-[12px] font-bold rounded-xl transition-all"
          >
            取消生成
          </button>
        </div>

      </div>

      {/* Speed dial runner helper animation keyframes */}
      <style>{`
        @keyframes runner-anim {
          0% { left: -10%; }
          50% { left: 90%; }
          100% { left: -10%; }
        }
        .animate-runner-indicator {
          animation: runner-anim 2s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
};
