import React, { useEffect, useState } from 'react';
import {
  CloudRain,
  MapPin, 
  User, 
  Flame, 
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
  Cloud, 
  Activity, 
  MousePointerClick,
  Sparkles,
  Globe, 
  Ruler, 
  Volume2, 
  Smartphone, 
  Map, 
  Info, 
  Lock, 
  FileText, 
  ChevronRight, 
  Clock, 
  Settings, 
  QrCode, 
  Edit3, 
  Camera, 
  HelpCircle,
  LogOut,
  ArrowLeft,
  Image as ImageIcon
} from 'lucide-react';
import { useI18n } from '../i18n';
import { ScreenId } from '../types';

/* ==========================================
   Screen 5: Onboarding Screen (首次使用引导页)
   ========================================== */
interface OnboardingScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onNavigate }) => {
  const [activeSlide, setActiveSlide] = useState(1); // 0, 1, 2 representing cards

  return (
    <div className="flex flex-col h-full bg-linear-to-b from-[#4FACFE] to-[#00F2FE] text-white p-5 select-none justify-between relative overflow-hidden">
      
      {/* Decorative backdrop blobs */}
      <div className="absolute -top-12 -left-12 w-40 h-40 rounded-full bg-white/10 blur-xl pointer-events-none"></div>
      <div className="absolute top-1/2 -right-16 w-52 h-52 rounded-full bg-white/10 blur-2xl pointer-events-none"></div>

      {/* Top Header App Name */}
      <div className="text-center pt-6">
        <h2 className="text-xl font-extrabold tracking-widest text-white/90">轨迹工坊 App</h2>
        <p className="text-[11px] text-white/70 mt-1 uppercase tracking-wider">用汗水在地图上作画</p>
      </div>

      {/* 3-Card Carousel Representation */}
      <div className="flex items-center justify-center my-auto relative h-[256px]">
        {/* Card 1: Left Card */}
        <div 
          onClick={() => setActiveSlide(0)}
          className={`absolute left-0 w-[84px] h-[164px] bg-white/15 backdrop-blur-md rounded-2xl p-3 flex flex-col justify-center items-center text-center transition-all duration-500 cursor-pointer ${
            activeSlide === 0 
              ? 'scale-110 z-20 bg-white/25 border-t border-white/20' 
              : 'scale-90 opacity-40 blur-[1px] translate-x-[-12px] z-10'
          }`}
        >
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white mb-2 shadow-xs">
            <Cloud size={18} />
          </div>
          <span className="text-[11px] font-bold block leading-tight">1. 上传图片</span>
          <span className="text-[8px] text-white/70 leading-none mt-1">任意图片转换</span>
        </div>

        {/* Card 2: Center Card */}
        <div 
          onClick={() => setActiveSlide(1)}
          className={`absolute w-[184px] h-[212px] bg-white/20 backdrop-blur-xl rounded-[24px] p-5 flex flex-col justify-center items-center text-center transition-all duration-500 border border-white/30 shadow-xl cursor-pointer ${
            activeSlide === 1 
              ? 'scale-105 z-30 translate-x-0 bg-white/25' 
              : activeSlide === 0 
                ? 'translate-x-[64px] scale-90 opacity-50 blur-[2px] z-10' 
                : 'translate-x-[-64px] scale-90 opacity-50 blur-[2px] z-10'
          }`}
        >
          <div className="w-14 h-14 rounded-full bg-linear-to-tr from-white to-blue-50 flex items-center justify-center text-[#4FACFE] mb-4 shadow-lg">
            <CloudRain size={26} className="text-[#4FACFE]" />
          </div>
          <h3 className="text-[17px] font-extrabold tracking-tight">2. 生成轨迹</h3>
          <p className="text-[11px] text-white/80 mt-2.5 leading-normal select-none">
            AI 智能提取运动路径，<br />
            或点击手动描边绘制。
          </p>
        </div>

        {/* Card 3: Right Card */}
        <div 
          onClick={() => setActiveSlide(2)}
          className={`absolute right-0 w-[84px] h-[164px] bg-white/15 backdrop-blur-md rounded-2xl p-3 flex flex-col justify-center items-center text-center transition-all duration-500 cursor-pointer ${
            activeSlide === 2 
              ? 'scale-110 z-20 bg-white/25 border-t border-white/20' 
              : 'scale-90 opacity-40 blur-[1px] translate-x-[12px] z-10'
          }`}
        >
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white mb-2 shadow-xs">
            <MapPin size={18} />
          </div>
          <span className="text-[11px] font-bold block leading-tight">3. 跟着跑！</span>
          <span className="text-[8px] text-white/70 leading-none mt-1">语音偏差实时指流</span>
        </div>
      </div>

      {/* Carousel dots */}
      <div className="flex justify-center space-x-1.5 mb-2">
        {[0, 1, 2].map((slideIdx) => (
          <button
            key={slideIdx}
            onClick={() => setActiveSlide(slideIdx)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              activeSlide === slideIdx ? 'w-4.5 bg-white' : 'w-1.5 bg-white/40'
            }`}
          ></button>
        ))}
      </div>

      {/* Action triggers */}
      <div className="flex flex-col space-y-4 mb-3">
        {/* Big Start button */}
        <button
          onClick={() => onNavigate('home')}
          className="w-full py-3.5 bg-white text-gray-800 hover:bg-opacity-95 font-black text-sm tracking-widest rounded-full shadow-lg shadow-[#00F2FE]/20 active:scale-98 transition-all"
        >
          开始体验
        </button>

        {/* Footnotes */}
        <button 
          onClick={() => onNavigate('home')} 
          className="text-center text-[12px] text-white/70 hover:text-white transition-colors"
        >
          已有账号？<span className="underline font-bold">登录</span>
        </button>
      </div>

    </div>
  );
};


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


/* ==========================================
   Screen 11: Login/Register Screen (注册登录页)
   ========================================== */
interface LoginScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onNavigate }) => {
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showDocModal, setShowDocModal] = useState<'privacy' | 'agreement' | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const handleThirdPartyLogin = (platform: 'wechat' | 'douyin') => {
    setIsLoggingIn(true);
    triggerToast(`正在拉起${platform === 'wechat' ? '微信' : '抖音'}协议授权...`);
    setTimeout(() => {
      setIsLoggingIn(false);
      triggerToast('授权成功，已为您登录！');
      setTimeout(() => {
        onNavigate('profile');
      }, 500);
    }, 1500);
  };

  const sendSMS = () => {
    if (!phoneNumber || phoneNumber.length < 11) {
      triggerToast('请输入合法的11位手机号');
      return;
    }
    setIsSendingCode(true);
    triggerToast('验证码发送中...');
    setTimeout(() => {
      setIsSendingCode(false);
      setCodeSent(true);
      setSmsCode('8888'); // Autofill mockup
      triggerToast('验证码[8888]已发送');
    }, 1000);
  };

  const handlePhoneLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber || phoneNumber.length < 11) {
      triggerToast('请输入合法的11位手机号');
      return;
    }
    if (!smsCode) {
      triggerToast('请输入验证码');
      return;
    }
    setIsLoggingIn(true);
    setShowPhoneModal(false);
    triggerToast('正在验证手机/短信授权...');
    setTimeout(() => {
      setIsLoggingIn(false);
      triggerToast('登录成功，欢迎回来！');
      setTimeout(() => {
        onNavigate('profile');
      }, 500);
    }, 1200);
  };

  return (
    <div className="flex flex-col h-full bg-white text-slate-850 p-5 select-none justify-between relative overflow-hidden">
      
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-gray-900/90 text-white text-[11px] font-bold px-4 py-2.5 rounded-full z-50 flex items-center space-x-2 shadow-lg backdrop-blur-md animate-bounce">
          <div className="w-1.5 h-1.5 bg-[#00F2FE] rounded-full animate-ping"></div>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Section */}
      <div className="flex flex-col items-center pt-8">
        {/* App Logo */}
        <div className="w-[80px] h-[80px] rounded-full bg-gradient-to-tr from-[#4FACFE] to-[#00F2FE] flex items-center justify-center shadow-lg shadow-[#4FACFE]/25 mb-4 animate-pulse">
          {/* Running person icon white */}
          <svg viewBox="0 0 24 24" className="w-10 h-10 text-white fill-none stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" fill="currentColor"/>
            <path d="M14 9.5 12 11l-3-2.5-3.5 2"/>
            <path d="M12 11v4l-2.5 3L7 16"/>
            <path d="M12 15l1.5 2.5 3.5-1M13 5.5l.5 4"/>
          </svg>
        </div>

        {/* App Title */}
        <h1 className="text-[28px] font-black tracking-tight text-slate-800 leading-none">轨迹工坊</h1>
        {/* Slogan */}
        <p className="text-[14px] text-slate-400 mt-2 font-medium">跑出你的专属形状</p>
      </div>

      {/* Central Illustration Region (Star Trail Run) */}
      <div className="w-full h-36 flex items-center justify-center my-1 relative">
        <svg viewBox="0 0 200 120" className="w-full h-full max-w-[240px] drop-shadow-sm">
          <defs>
            <linearGradient id="trailLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4FACFE" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#00F2FE" stopOpacity="0.8" />
            </linearGradient>
            <filter id="shadowGlow" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Guidelines matching client request */}
          <line x1="10" y1="95" x2="190" y2="95" stroke="#F1F5F9" strokeWidth="1.5" strokeDasharray="3 3" />
          <line x1="35" y1="20" x2="35" y2="95" stroke="#F1F5F9" strokeWidth="1.5" strokeDasharray="3 3" />
          <line x1="165" y1="20" x2="165" y2="95" stroke="#F1F5F9" strokeWidth="1.5" strokeDasharray="3 3" />

          {/* Curved path */}
          <path d="M25,85 C65,25 110,105 155,50" fill="none" stroke="url(#trailLogoGrad)" strokeWidth="5.5" strokeLinecap="round" />

          {/* Yellow/Teal Glowing star trails */}
          <polygon points="25,85 27,89 31,89 28,92 29,96 25,94 21,96 22,92 19,89 23,89" fill="#4FACFE" className="opacity-40" />
          <polygon points="85,60 88,65 93,65 89,69 91,74 85,71 79,74 81,69 77,65 82,65" fill="#00F2FE" className="opacity-75 animate-pulse" />
          <polygon points="152,50 156,57 164,58 158,65 160,73 152,69 144,73 146,65 140,58 148,57" fill="#00F2FE" filter="url(#shadowGlow)" className="animate-pulse" />

          {/* Running athlete figure outline */}
          <g transform="translate(138, 12)" className="animate-bounce" style={{ animationDuration: '3s' }}>
            <circle cx="20" cy="10" r="4.5" fill="#4FACFE" />
            <path d="M19,15 C20,15 22,17 21,28 C21,29 18,34 16,33" stroke="#00F2FE" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M21,15 L14,19 L9,17" stroke="#4FACFE" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <path d="M21,15 L27,19 L30,23" stroke="#00F2FE" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            {/* Legs */}
            <path d="M19,26 L12,34 L17,39" stroke="#4FACFE" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M21,26 L26,32 L20,38" stroke="#00F2FE" strokeWidth="3" strokeLinecap="round" fill="none" />
          </g>

          <circle cx="70" cy="30" r="1.5" fill="#4FACFE" className="animate-ping" style={{ animationDuration: '2.5s' }} />
          <circle cx="115" cy="80" r="1" fill="#00F2FE" className="animate-pulse" />
        </svg>
      </div>

      {/* Buttons Area */}
      <div className="flex flex-col items-center space-y-3 px-1">
        {/* Wechat Login */}
        <button 
          id="btn_wechat_login"
          onClick={() => handleThirdPartyLogin('wechat')}
          className="w-[85%] h-[52px] bg-white rounded-[32px] shadow-[0_5px_15px_rgba(0,0,0,0.06)] hover:shadow-md border border-gray-100 flex items-center px-6 active:scale-[0.98] transition-all cursor-pointer justify-center relative overflow-hidden group"
        >
          {/* Inner slick highlight */}
          <div className="absolute inset-x-0 top-0 h-[1px] bg-white/50"></div>
          {/* Green WeChat Icon */}
          <div className="absolute left-6 text-[#07C160]">
            <svg viewBox="0 0 24 24" className="w-[20px] h-[20px]" fill="currentColor">
              <path d="M8.5,13.5c-.3,0-.5-.2-.5-.5s.2-.5.5-.5.5.2.5.5-.2.5-.5.5zm4.5,0c-.3,0-.5-.2-.5-.5s.2-.5.5-.5.5.2.5.5-.2.5-.5.5zm.8,4c2.8,0,5.2-1.7,5.2-3.8c0-2.1-2.4-3.8-5.2-3.8c-2.9,0-5.3,1.7-5.3,3.8c0,2.1,2.4,3.8,5.3,3.8zm-5.3-7c2.2,0,4-1.5,4-3.5c0-1.9-1.8-3.5-4-3.5c-2.3,0-4.1,1.6-4.1,3.5c0,2,1.8,3.5,4.1,3.5zm-2-5c.3,0,.5.2.5.5s-.2.5-.5.5-.5-.2-.5-.5.2-.5.5-.5zm2.8,0c.3,0,.5.2.5.5s-.2.5-.5.5-.5-.2-.5-.5.2-.5.5-.5z" />
            </svg>
          </div>
          <span className="text-[16px] font-bold text-slate-700">微信一键登录</span>
        </button>

        {/* Douyin Login */}
        <button 
          id="btn_douyin_login"
          onClick={() => handleThirdPartyLogin('douyin')}
          className="w-[85%] h-[52px] bg-white rounded-[32px] shadow-[0_5px_15px_rgba(0,0,0,0.06)] hover:shadow-md border border-gray-100 flex items-center px-6 active:scale-[0.98] transition-all cursor-pointer justify-center relative group"
        >
          {/* Black musical note icon */}
          <div className="absolute left-6 text-black font-semibold">
            <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="currentColor">
              <path d="M12,2a1,1,0,0,0-1,1v10.5a2.5,2.5,0,1,1-3.5-2.28V7a1,1,0,0,0-1-1H4A1,1,0,0,0,3,7a9,9,0,1,0,9-5Zm0,18a7,7,0,1,1,5-1.93A5.49,5.49,0,0,0,14,13V3h1.5A5.5,5.5,0,0,1,21,8.5v1.5a1,1,0,0,1-1,1h-1.5A5.5,5.5,0,0,1,13,7.18V20A7,7,0,0,1,12,20Z"/>
            </svg>
          </div>
          <span className="text-[16px] font-bold text-slate-700">抖音一键登录</span>
        </button>

        {/* Divider */}
        <div className="w-[80%] flex items-center justify-between py-2">
          <div className="flex-1 h-[0.5px] bg-slate-200"></div>
          <span className="text-[12px] text-slate-400 px-3 font-medium">或</span>
          <div className="flex-1 h-[0.5px] bg-slate-200"></div>
        </div>

        {/* Alternate login route */}
        <button 
          id="btn_phone_login"
          onClick={() => setShowPhoneModal(true)}
          className="text-[14px] font-bold bg-gradient-to-r from-[#4FACFE] to-[#00F2FE] bg-clip-text text-transparent active:opacity-70 transition-all cursor-pointer"
        >
          手机号登录
        </button>
      </div>

      {/* Terms & Protocols */}
      <div className="text-center pb-6 px-4">
        <p className="text-[10px] text-slate-400 inline">
          登录即表示同意
        </p>
        <button 
          onClick={() => setShowDocModal('agreement')}
          className="text-[10px] font-bold text-[#4FACFE] hover:underline px-0.5"
        >
          《用户协议》
        </button>
        <p className="text-[10px] text-slate-400 inline">和</p>
        <button 
          onClick={() => setShowDocModal('privacy')}
          className="text-[10px] font-bold text-[#4FACFE] hover:underline px-0.5"
        >
          《隐私政策》
        </button>
      </div>

      {/* Loading Overlay */}
      {isLoggingIn && (
        <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex items-center justify-center z-50">
          <div className="bg-slate-900 text-white rounded-2xl p-5 flex flex-col items-center justify-center space-y-3 shadow-xl">
            <div className="w-10 h-10 border-4 border-t-[#00F2FE] border-[#4FACFE]/20 rounded-full animate-spin"></div>
            <span className="text-xs font-semibold">正在登录您的轨迹工坊...</span>
          </div>
        </div>
      )}

      {/* PORT 1: SMS Phone login popup modal */}
      {showPhoneModal && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-end justify-center z-40 animate-fade-in">
          <div className="w-full bg-white rounded-t-[32px] p-6 shadow-2xl flex flex-col space-y-4 bottom-0 animate-slide-up max-h-[75%] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h3 className="text-base font-bold text-slate-800">手机号快捷登录</h3>
              <button 
                onClick={() => setShowPhoneModal(false)}
                className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-slate-500 font-bold active:bg-gray-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePhoneLoginSubmit} className="space-y-4 pt-2">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase">中国大陆手机号 (+86)</label>
                <div className="flex items-center border border-gray-200 rounded-xl px-3 py-2.5 bg-gray-50 focus-within:border-[#4FACFE] focus-within:bg-white transition-colors">
                  <span className="text-[14px] text-slate-500 mr-2 font-bold font-mono">+86</span>
                  <input
                    type="tel"
                    maxLength={11}
                    placeholder="请输入11位手机号码"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                    className="flex-1 bg-transparent border-none outline-none text-[14px] font-mono text-slate-800 placeholder-slate-400"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase">短信验证码</label>
                <div className="flex items-center justify-between space-x-2">
                  <div className="flex-1 flex items-center border border-gray-200 rounded-xl px-3 py-2.5 bg-gray-50 focus-within:border-[#4FACFE] focus-within:bg-white transition-colors">
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="验证码"
                      value={smsCode}
                      onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-transparent border-none outline-none text-[14px] font-mono text-slate-800 placeholder-slate-400"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={sendSMS}
                    disabled={isSendingCode}
                    className="px-4 py-2.5 bg-slate-100 active:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 border border-slate-200 hover:border-slate-300 disabled:opacity-50 transition-all shrink-0"
                  >
                    {isSendingCode ? '发送中' : codeSent ? '重新获取' : '获取验证码'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={!phoneNumber || !smsCode}
                className="w-full py-3.5 bg-gradient-to-r from-[#4FACFE] to-[#00F2FE] hover:brightness-105 active:scale-[0.99] rounded-[24px] text-white font-bold text-sm tracking-wider shadow-lg shadow-[#4FACFE]/25 disabled:opacity-50 transition-all text-center mt-3"
              >
                授权并绑定登录（测试直通）
              </button>
            </form>
          </div>
        </div>
      )}

      {/* PORT 2: Agreement or Privacy modals */}
      {showDocModal && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-5 z-40">
          <div className="bg-white rounded-3xl w-full max-w-xs p-5 shadow-2xl flex flex-col space-y-4 max-h-[80%]">
            <h3 className="text-base font-extrabold text-slate-800 border-b pb-2">
              {showDocModal === 'privacy' ? '轨迹工坊隐私政策说明' : '轨迹工坊用户服务协议'}
            </h3>
            
            <div className="text-[12px] text-slate-500 overflow-y-auto max-h-56 space-y-2 leading-relaxed">
              <p className="font-bold text-slate-700">更新日期：2026年6月9日</p>
              <p>欢迎阁下使用“轨迹工坊”运动绘图寻航应用软件！</p>
              <p>为了保障您的合法合法权益，请务必仔细阅读本文件。我们深度关注您的个人信息和隐私数据保护：</p>
              <p>1. 我们仅在您使用“手动描边(4)”或“图片寻回(9)”以及位置跟踪时访问您的地理坐标，且采用最严格的脱敏算法保密，坚决不上送任何社交无关机密。</p>
              <p>2. 账号绑定基于微信/抖音官方静默授权流程，提供一键免密码注册，不采集不索要明文账户密码。</p>
              <p>3. 您有随时清除本地生成图片缓存(13)以及彻底注销本人账号权利。</p>
            </div>

            <button
              onClick={() => setShowDocModal(null)}
              className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs text-center transition-colors"
            >
              已阅并同意
            </button>
          </div>
        </div>
      )}

    </div>
  );
};


/* ==========================================
   Screen 12: Profile Center Screen (个人中心页)
   ========================================== */
interface ProfileScreenProps {
  onNavigate: (screen: ScreenId) => void;
  activeNavbarTab: 'home' | 'traces' | 'profile';
  setActiveNavbarTab: (tab: 'home' | 'traces' | 'profile') => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  onNavigate,
  activeNavbarTab,
  setActiveNavbarTab,
}) => {
  const [showQRModal, setShowQRModal] = useState(false);
  const [toastText, setToastText] = useState<string | null>(null);

  const showToast = (txt: string) => {
    setToastText(txt);
    setTimeout(() => setToastText(null), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-white text-slate-800 select-none relative pb-[68px]">
      
      {/* Toast overlay */}
      {toastText && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-gray-900/95 text-white text-[11px] font-bold px-4 py-2 rounded-full z-50 shadow-sm flex items-center space-x-1 animate-pulse">
          <span>🎯</span>
          <span>{toastText}</span>
        </div>
      )}

      {/* Main Content Area Scrollable */}
      <div className="flex-1 overflow-y-auto pb-4 pt-4 shrink-0">
        
        {/* Page title header */}
        <div className="text-center pb-4 pt-1">
          <h2 className="text-[17px] font-extrabold text-slate-800">个人中心</h2>
        </div>

        {/* 1. User Info Card */}
        <div 
          id="user_info_card"
          className="mx-4 bg-white rounded-[24px] p-4 border border-gray-100/80 shadow-[0_4px_16px_rgba(0,0,0,0.03)] flex flex-col justify-between relative mb-5 group hover:border-[#4FACFE]/20 transition-all"
        >
          <div className="flex items-center justify-between pb-3.5 border-b border-gray-100">
            <div className="flex items-center space-x-3.5">
              
              {/* Profile Avatar with clickable edit indicator */}
              <div 
                onClick={() => showToast('上传个人照片头像功能正在建设中')}
                className="w-16 h-16 rounded-full bg-slate-100 border-2 border-slate-200/60 relative cursor-pointer group-hover:border-[#00F2FE]/50 transition-colors flex items-center justify-center shrink-0 overflow-hidden"
              >
                {/* Visual Placeholder (running blue silhouette) */}
                <span className="text-2xl">🏃‍♂️</span>
                
                {/* Mini Edit Camera overlay */}
                <div className="absolute bottom-0 right-0 w-5 h-5 bg-gradient-to-r from-[#4FACFE] to-[#00F2FE] text-white rounded-full flex items-center justify-center border border-white shrink-0">
                  <Camera size={10} className="stroke-[2.5]" />
                </div>
              </div>

              {/* Text Info */}
              <div>
                <h3 className="text-[18px] font-black text-slate-800 flex items-center gap-1">
                  <span>跑者小明</span>
                  <span className="text-[9px] font-bold bg-[#4FACFE]/10 text-[#4FACFE] px-1.5 py-0.5 rounded-full">中级达人</span>
                </h3>
                <p className="text-[12px] text-slate-400 mt-1 font-mono">ID: 12345678</p>
              </div>
            </div>

            {/* Right Side: Clickable QR Code */}
            <button
              id="btn_view_qrcode"
              onClick={() => setShowQRModal(true)}
              className="w-9 h-9 rounded-full bg-teal-50 flex items-center justify-center text-[#4FACFE] hover:bg-teal-100/65 active:scale-95 transition-all outline-none"
              title="显示个人二维码"
            >
              <QrCode size={18} className="stroke-[2.5]" />
            </button>
          </div>

          {/* Slogan Quote Bottom line inside card */}
          <div className="pt-2 px-1 flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <span>个性签名: 用汗水在水泥地上书写画作</span>
            <span className="text-[#00F2FE]/90 font-bold hover:underline cursor-pointer" onClick={() => showToast('个性签名修改')}>修改</span>
          </div>
        </div>

        {/* 2. Stats Counters Tri-column */}
        <div className="px-4 grid grid-cols-3 gap-3 mb-6">
          {/* Box 1 */}
          <div 
            onClick={() => showToast('本周累计跑步328公里，超越了95%的跑者')}
            className="bg-white rounded-[16px] p-3.5 border border-gray-100 shadow-[0_4px_12px_rgba(0,0,0,0.02)] text-center flex flex-col justify-center active:scale-98 transition-all hover:border-[#4FACFE]/10 cursor-pointer"
          >
            <span className="text-[20px] font-extrabold text-slate-800 leading-tight">328</span>
            <span className="text-[11px] text-slate-400 mt-1">总距离 (km)</span>
          </div>

          {/* Box 2 */}
          <div 
            onClick={() => showToast('专注运动42小时，继续加油！')}
            className="bg-white rounded-[16px] p-3.5 border border-gray-100 shadow-[0_4px_12px_rgba(0,0,0,0.02)] text-center flex flex-col justify-center active:scale-98 transition-all hover:border-[#4FACFE]/10 cursor-pointer"
          >
            <span className="text-[20px] font-extrabold text-slate-800 leading-tight">42</span>
            <span className="text-[11px] text-slate-400 mt-1">总时长 (时)</span>
          </div>

          {/* Box 3 */}
          <div 
            onClick={() => showToast('已成功在画板及真实街道上拓画28个足迹')}
            className="bg-white rounded-[16px] p-3.5 border border-gray-100 shadow-[0_4px_12px_rgba(0,0,0,0.02)] text-center flex flex-col justify-center active:scale-98 transition-all hover:border-[#4FACFE]/10 cursor-pointer"
          >
            <span className="text-[20px] font-extrabold text-slate-800 leading-tight">28</span>
            <span className="text-[11px] text-slate-400 mt-1">完成轨迹 (个)</span>
          </div>
        </div>

        {/* 3. Function List group 1: 我的内容 */}
        <div className="mb-4">
          <h4 className="text-[14px] font-bold text-slate-500 mb-2.5 px-4">我的内容</h4>
          <div className="bg-white border-y border-gray-50 divide-y divide-gray-100">
            {/* Item 1 */}
            <div 
              onClick={() => onNavigate('my_traces')}
              className="flex items-center justify-between py-3.5 px-4 active:bg-gray-55/60 transition-colors cursor-pointer"
            >
              <div className="flex items-center space-x-3 text-slate-700">
                <ImageIcon size={18} className="text-[#4FACFE] stroke-[2.3]" />
                <span className="text-[16px] font-medium">我的轨迹作品</span>
              </div>
              <div className="flex items-center space-x-1 text-slate-400">
                <span className="text-[12px] font-semibold bg-slate-100 px-2 py-0.5 rounded-full text-slate-500">28</span>
                <ChevronRight size={16} />
              </div>
            </div>

            {/* Item 2 */}
            <div 
              onClick={() => onNavigate('run_history')}
              className="flex items-center justify-between py-3.5 px-4 active:bg-gray-55/60 transition-colors cursor-pointer"
            >
              <div className="flex items-center space-x-3 text-slate-700">
                <Clock size={18} className="text-[#4FACFE] stroke-[2.3]" />
                <span className="text-[16px] font-medium">历史记录</span>
              </div>
              <ChevronRight size={16} className="text-slate-300" />
            </div>

            {/* Item 3 */}
            <div 
              onClick={() => onNavigate('favorites')}
              className="flex items-center justify-between py-3.5 px-4 active:bg-gray-55/60 transition-colors cursor-pointer"
            >
              <div className="flex items-center space-x-3 text-slate-700">
                <Heart size={18} className="text-[#4FACFE] stroke-[2.3]" />
                <span className="text-[16px] font-medium">收藏模板</span>
              </div>
              <div className="flex items-center space-x-1 text-slate-400">
                <span className="text-[12px] font-semibold bg-pink-50 text-pink-500 px-2 py-0.5 rounded-full">12</span>
                <ChevronRight size={16} />
              </div>
            </div>
          </div>
        </div>

        {/* 4. Function List group 2: 其他 (点击设置可直达其子级13!) */}
        <div className="mb-6">
          <h4 className="text-[14px] font-bold text-slate-500 mb-2.5 px-4">其他</h4>
          <div className="bg-white border-y border-gray-50 divide-y divide-gray-100">
            {/* Item 4 - Settings (Goes directly to settings screen!) */}
            <div 
              id="btn_go_settings"
              onClick={() => onNavigate('settings')}
              className="flex items-center justify-between py-3.5 px-4 active:bg-gray-55/60 transition-colors cursor-pointer"
            >
              <div className="flex items-center space-x-3 text-slate-700">
                <Settings size={18} className="text-[#4FACFE] stroke-[2.3]" />
                <span className="text-[16px] font-medium">设置</span>
              </div>
              <ChevronRight size={16} className="text-slate-300" />
            </div>

            {/* Item 5 - About Us */}
            <div 
              onClick={() => showToast('轨迹工坊 App - 跑出不一样的运动奇遇。当前版本 v1.0.0')}
              className="flex items-center justify-between py-3.5 px-4 active:bg-gray-55/60 transition-colors cursor-pointer"
            >
              <div className="flex items-center space-x-3 text-slate-700">
                <Info size={18} className="text-[#4FACFE] stroke-[2.3]" />
                <span className="text-[16px] font-medium">关于我们</span>
              </div>
              <ChevronRight size={16} className="text-slate-300" />
            </div>

            {/* Item 6 - Feedback help */}
            <div 
              onClick={() => showToast('欢迎发送您的宝贵反馈至 hanshutan110@gmail.com')}
              className="flex items-center justify-between py-3.5 px-4 active:bg-gray-55/60 transition-colors cursor-pointer"
            >
              <div className="flex items-center space-x-3 text-slate-700">
                <HelpCircle size={18} className="text-[#4FACFE] stroke-[2.3]" />
                <span className="text-[16px] font-medium">帮助与反馈</span>
              </div>
              <ChevronRight size={16} className="text-slate-300" />
            </div>
          </div>
        </div>

        {/* 5. Logout Button (Returns back to onboarding) */}
        <div className="text-center py-2 mb-4">
          <button 
            id="btn_logout_action"
            onClick={() => {
              showToast('已安全退出登录');
              setTimeout(() => {
                onNavigate('login');
              }, 600);
            }}
            className="text-[14px] font-bold text-slate-400 hover:text-red-400 active:scale-95 transition-all px-6 py-2.5 rounded-full"
          >
            退出登录
          </button>
        </div>

      </div>

      {/* Persistent bottom static phone mock navbar */}
      <div className="absolute bottom-0 left-0 right-0 h-[68px] bg-white border-t border-gray-100 flex items-center justify-around px-4 z-15">
        <button 
          onClick={() => {
            setActiveNavbarTab('home');
            onNavigate('home');
          }}
          className={`flex flex-col items-center justify-center flex-1 py-1 text-gray-400`}
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.3">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <span className="text-[10px] font-medium mt-1">首页</span>
        </button>

        <button 
          onClick={() => {
            setActiveNavbarTab('traces');
            onNavigate('my_traces');
          }}
          className={`flex flex-col items-center justify-center flex-1 py-1 text-gray-400`}
        >
          <Activity size={20} className="stroke-[2.3]" />
          <span className="text-[10px] font-medium mt-1">我的轨迹</span>
        </button>

        <button 
          onClick={() => {
            setActiveNavbarTab('profile');
            onNavigate('profile');
          }}
          className={`flex flex-col items-center justify-center flex-1 py-1 text-[#4FACFE]`}
        >
          {/* User Icon high-light filled */}
          <User size={20} className="stroke-[2.5]" />
          <span className="text-[10px] font-bold mt-1">个人中心</span>
        </button>
      </div>

      {/* Overlay modal for Personal QR Code display */}
      {showQRModal && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-6 z-40">
          <div className="bg-white rounded-3xl w-full max-w-xs p-6 shadow-2xl flex flex-col items-center text-center space-y-4">
            
            {/* Modal close */}
            <div className="w-full flex justify-end">
              <button 
                onClick={() => setShowQRModal(false)}
                className="w-7 h-7 rounded-full bg-gray-100 text-gray-400 hover:text-gray-800 flex items-center justify-center font-bold active:bg-gray-200 text-xs"
              >
                ✕
              </button>
            </div>

            {/* Title inside */}
            <div className="text-center">
              <h3 className="text-[15px] font-black text-slate-800">轨迹工坊跑者名片</h3>
              <p className="text-[10px] text-slate-400 mt-1">扫码一键添加跑友 / 跟踪他的轨迹作品</p>
            </div>

            {/* QR Card container */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-gray-100 relative">
              {/* Profile in miniature */}
              <div className="flex items-center space-x-2.5 pb-3 border-b border-gray-200/60 mb-3 text-left">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#4FACFE] to-[#00F2FE] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                  明
                </div>
                <div>
                  <h4 className="text-[13px] font-bold text-slate-800">跑者小明</h4>
                  <p className="text-[9px] text-slate-400 mt-0.5 leading-none">累计跑量 328km | 中级达人</p>
                </div>
              </div>

              {/* Real QR Mock Graphic inside */}
              <div className="w-40 h-40 bg-white p-3 rounded-xl flex items-center justify-center shadow-inner relative overflow-hidden">
                <svg viewBox="0 0 100 100" className="w-full h-full text-slate-800">
                  {/* Visual matrix squares */}
                  <rect x="0" y="0" width="25" height="25" fill="currentColor" />
                  <rect x="5" y="5" width="15" height="15" fill="white" />
                  <rect x="9" y="9" width="7" height="7" fill="currentColor" />

                  <rect x="75" y="0" width="25" height="25" fill="currentColor" />
                  <rect x="80" y="5" width="15" height="15" fill="white" />
                  <rect x="84" y="9" width="7" height="7" fill="currentColor" />

                  <rect x="0" y="75" width="25" height="25" fill="currentColor" />
                  <rect x="5" y="80" width="15" height="15" fill="white" />
                  <rect x="9" y="84" width="7" height="7" fill="currentColor" />

                  {/* Random scattered pattern blobs representing complex QR matrix */}
                  <path d="M35,5 h5 v5 h-5 z M45,0 h10 v5 h-5 v10 h-5 z M60,5 h10 v5 h-10 z M35,20 h5 v10 h-5 z M50,25 h15 v5 h-15 z M70,25 h5 v5 h-5 z M80,30 h10 v10 h-10 z M15,35 h15 v5 h-15 z" fill="currentColor" />
                  <path d="M35,45 h10 v15 h-10 z M55,40 h15 v5 h-15 z M75,45 h10 v5 h-10 z M90,55 h10 v10 h-10 z M5,55 h10 v10 h-10 z M20,60 h10 v15 h-10 z M50,60 h10 v10 h-10 z M70,60 h20 v5 h-20 z" fill="currentColor" />
                  <path d="M35,80 h15 v15 h-15 z M60,80 h15 v5 h-15 z M80,80 h15 v15 h-15 z M90,70 h10 v10 h-10 z M55,90 h10 v10-10 z M75,90 h15 v10 h-15 z M5,30 h10 v10 h-10 z" fill="currentColor" />

                  {/* Central App icon logo placeholder inside QR */}
                  <rect x="38" y="38" width="24" height="24" fill="white" rx="4" />
                  <rect x="40" y="40" width="20" height="20" fill="url(#qrGradient)" rx="3" />
                  <defs>
                    <linearGradient id="qrGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#4FACFE" />
                      <stop offset="100%" stopColor="#00F2FE" />
                    </linearGradient>
                  </defs>
                  {/* Miniature runner */}
                  <path d="M47,44 A1.5,1.5 0 1,1 50,44 A1.5,1.5 0 1,1 47,44 M47,46.5 L49,49 L46,52 L51,55" fill="none" stroke="white" strokeWidth="1" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            <button
              onClick={() => showToast('跑者名片截图已保存至本地相册')}
              className="w-full py-2.5 bg-gradient-to-r from-[#4FACFE] to-[#00F2FE] hover:brightness-105 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition-all shrink-0"
            >
              保存至系统相册
            </button>
          </div>
        </div>
      )}

    </div>
  );
};


/* ==========================================
   Screen 13: Settings Screen (设置页)
   ========================================== */
interface SettingsScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onNavigate }) => {
  const [toastContent, setToastContent] = useState<string | null>(null);
  
  // Settings control states (iOS slider switches in React)
  const [voiceBroadcast, setVoiceBroadcast] = useState(true);
  const [vibeDeviation, setVibeDeviation] = useState(true);
  const [distanceUnit, setDistanceUnit] = useState<'km' | 'mile'>('km');
  const { language, setLanguage, languageOptions, languageLabels } = useI18n();
  const [mapStyleStyle, setMapStyleStyle] = useState<'light' | 'satellite'>('light');
  const [lineWeightThickness, setLineWeightThickness] = useState<'mid' | 'thick' | 'thin'>('mid');
  const [cacheMemoryMB, setCacheMemoryMB] = useState(128);

  const [showLanguageSheet, setShowLanguageSheet] = useState(false);
  const [showMapSheet, setShowMapSheet] = useState(false);
  const [showThicknessSheet, setShowThicknessSheet] = useState(false);

  const showToast = (msg: string) => {
    setToastContent(msg);
    setTimeout(() => {
      setToastContent(null);
    }, 2000);
  };

  const clearCacheAction = () => {
    if (cacheMemoryMB === 0) {
      showToast('缓存已被完全清空，无需二次清除');
      return;
    }
    showToast('正在为您深度清扫文件及地图轨迹图缓存...');
    setTimeout(() => {
      setCacheMemoryMB(0);
      showToast('128MB 缓存数据清除成功！');
    }, 1000);
  };

  return (
    <div className="flex flex-col h-full bg-white text-slate-800 select-none relative">
      
      {/* Toast notifications */}
      {toastContent && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-gray-900/95 text-white text-[11px] font-extrabold px-4.5 py-2.5 rounded-full z-50 text-center shadow-lg pointer-events-none flex items-center space-x-1.5 animate-bounce">
          <div className="w-1.5 h-1.5 bg-[#4FACFE] rounded-full animate-ping"></div>
          <span>{toastContent}</span>
        </div>
      )}

      {/* 1. TOP TITLE AREA BACK-HEADER */}
      <div className="h-[48px] border-b border-gray-100 flex items-center justify-between px-4 sticky top-0 bg-white/95 backdrop-blur-md z-10 shrink-0">
        <button 
          id="btn_settings_back"
          onClick={() => onNavigate('profile')} 
          className="w-9 h-9 rounded-full bg-gray-50 active:bg-gray-100 flex justify-center items-center text-slate-600 transition-colors"
          title="返回个人中心"
        >
          <ArrowLeft size={18} className="stroke-[2.5]" />
        </button>
        <h2 className="text-[16px] font-black text-slate-800">设置</h2>
        <div className="w-9"></div> {/* Balancer spacer */}
      </div>

      {/* Scrollable Container */}
      <div className="flex-1 overflow-y-auto bg-gray-50/50 pb-8">
        
        {/* User Info Micro-Card in top of settings */}
        <div className="bg-white p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center text-xl shrink-0 font-bold border border-gray-200">
              🏃‍♂️
            </div>
            <div>
              <h4 className="text-[14px] font-bold text-slate-800">跑者小明</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">UID: 12345678</p>
            </div>
          </div>
          {/* Active status */}
          <div className="flex items-center space-x-1.5 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full text-[11px] text-emerald-600">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
            <span className="font-bold">已绑定微信</span>
          </div>
        </div>

        {/* SECTION GROUP 1: 偏好设置 */}
        <div className="bg-gray-100 h-2.5"></div> {/* Splitting 8px grey gap bar */}
        <div className="bg-white">
          <div className="px-4 py-2 bg-gray-50/60 border-b border-gray-100">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">偏好设置</span>
          </div>

          <div className="divide-y divide-gray-100">
            {/* Setting 1: Language */}
            <div 
              id="set_language"
              onClick={() => setShowLanguageSheet(true)}
              className="h-[56px] px-4 flex items-center justify-between active:bg-slate-50 cursor-pointer transition-colors"
            >
              <div className="flex items-center space-x-3">
                <Globe size={18} className="text-[#4FACFE] stroke-[2.3]" />
                <span className="text-[15px] font-medium text-slate-700">语言</span>
              </div>
              <div className="flex items-center space-x-1.5 text-slate-400">
                <span className="text-[14px] font-semibold text-slate-500">
                  {languageLabels[language] || (language === 'cn' ? '简体中文' : 'English')}
                </span>
                <ChevronRight size={16} />
              </div>
            </div>

            {/* Setting 2: Distance Unit Toggle */}
            <div 
              id="set_distance_unit"
              onClick={() => {
                const nextUnit = distanceUnit === 'km' ? 'mile' : 'km';
                setDistanceUnit(nextUnit);
                showToast(`单位已切回: ${nextUnit === 'km' ? '公里 (Km)' : '英里 (Mile)'}`);
              }}
              className="h-[56px] px-4 flex items-center justify-between active:bg-slate-50 cursor-pointer transition-colors"
            >
              <div className="flex items-center space-x-3">
                <Ruler size={18} className="text-[#4FACFE] stroke-[2.3]" />
                <span className="text-[15px] font-medium text-slate-700">距离单位</span>
              </div>
              <div className="flex items-center space-x-1.5 text-slate-400">
                <span className="text-[14px] font-semibold text-slate-500">
                  {distanceUnit === 'km' ? '公里' : '英里'}
                </span>
                <ChevronRight size={16} />
              </div>
            </div>

            {/* Setting 3: Voice broadcast switch iOS style */}
            <div className="h-[56px] px-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Volume2 size={18} className="text-[#4FACFE] stroke-[2.3]" />
                <span className="text-[15px] font-medium text-slate-700">语音播报</span>
              </div>
              
              {/* iOS Switch */}
              <button
                id="toggle_voice"
                onClick={() => {
                  setVoiceBroadcast(!voiceBroadcast);
                  showToast(`语音广播播报已${!voiceBroadcast ? '恢复开启' : '成功关停'}`);
                }}
                className={`w-11.5 h-6 rounded-full p-0.5 transition-colors duration-200 outline-none ease-in ${
                  voiceBroadcast ? 'bg-[#4FACFE]' : 'bg-slate-200'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform duration-200 ${
                  voiceBroadcast ? 'translate-x-5.5' : 'translate-x-0'
                }`}></div>
              </button>
            </div>

            {/* Setting 4: Vibrate on deviation iOS style */}
            <div className="h-[56px] px-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Smartphone size={18} className="text-[#4FACFE] stroke-[2.3]" />
                <span className="text-[15px] font-medium text-slate-700">偏离时振动</span>
              </div>

              {/* iOS Switch */}
              <button
                id="toggle_vibration"
                onClick={() => {
                  setVibeDeviation(!vibeDeviation);
                  showToast(`偏航触感脉冲震动已${!vibeDeviation ? '打开' : '安全静音'}`);
                }}
                className={`w-11.5 h-6 rounded-full p-0.5 transition-colors duration-200 outline-none ease-in ${
                  vibeDeviation ? 'bg-[#4FACFE]' : 'bg-slate-200'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform duration-200 ${
                  vibeDeviation ? 'translate-x-5.5' : 'translate-x-0'
                }`}></div>
              </button>
            </div>
          </div>
        </div>

        {/* SECTION GROUP 2: 地图与导航 */}
        <div className="bg-gray-100 h-2.5"></div>
        <div className="bg-white">
          <div className="px-4 py-2 bg-gray-55/40 border-b border-gray-100">
            <span className="text-[11px] font-extrabold text-slate-400 tracking-widest uppercase">地图与导航</span>
          </div>

          <div className="divide-y divide-gray-100">
            {/* Setting 5: Map profile style */}
            <div 
              onClick={() => setShowMapSheet(true)}
              className="h-[56px] px-4 flex items-center justify-between active:bg-slate-50 cursor-pointer transition-colors"
            >
              <div className="flex items-center space-x-3">
                <Map size={18} className="text-[#4FACFE] stroke-[2.3]" />
                <span className="text-[15px] font-medium text-slate-700">地图样式</span>
              </div>
              <div className="flex items-center space-x-1.5 text-slate-400">
                <span className="text-[14px] font-semibold text-slate-500 font-sans">
                  {mapStyleStyle === 'light' ? '浅色模式' : '卫星高清'}
                </span>
                <ChevronRight size={16} />
              </div>
            </div>

            {/* Setting 6: Traj lines thick sizing */}
            <div 
              onClick={() => setShowThicknessSheet(true)}
              className="h-[56px] px-4 flex items-center justify-between active:bg-slate-50 cursor-pointer transition-colors"
            >
              <div className="flex items-center space-x-3">
                <Activity size={18} className="text-[#4FACFE] stroke-[2.3]" />
                <span className="text-[15px] font-medium text-slate-700">轨迹线粗细</span>
              </div>
              <div className="flex items-center space-x-1.5 text-slate-400">
                <span className="text-[14px] font-semibold text-slate-500 text-slate-500">
                  {lineWeightThickness === 'mid' ? '中等' : lineWeightThickness === 'thick' ? '极粗' : '精致极细'}
                </span>
                <ChevronRight size={16} />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION GROUP 3: 应用信息 */}
        <div className="bg-gray-100 h-2.5"></div>
        <div className="bg-white">
          <div className="px-4 py-2 bg-gray-55/40 border-b border-gray-100">
            <span className="text-[11px] font-extrabold text-slate-400 tracking-widest uppercase">应用信息</span>
          </div>

          <div className="divide-y divide-gray-100">
            {/* Setting 7: Current version */}
            <div 
              onClick={() => showToast('轨迹工坊官方尝鲜版 v1.0.0, 编译于2026年6月')}
              className="h-[56px] px-4 flex items-center justify-between text-slate-700"
            >
              <div className="flex items-center space-x-3">
                <Info size={18} className="text-[#4FACFE] stroke-[2.3]" />
                <span className="text-[15px] font-medium">当前版本</span>
              </div>
              <span className="text-[14px] font-mono font-semibold text-slate-400">v1.0.0</span>
            </div>

            {/* Setting 8: Version check */}
            <div 
              id="set_version_check"
              onClick={() => showToast('目前内核已是最新的，无可用更新。')}
              className="h-[56px] px-4 flex items-center justify-between active:bg-slate-50 cursor-pointer transition-colors"
            >
              <div className="flex items-center space-x-3">
                <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] text-[#4FACFE] fill-none stroke-current stroke-2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span className="text-[15px] font-medium text-slate-700">版本更新</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="text-[12px] font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full">已是最新版本</span>
                <ChevronRight size={16} className="text-slate-300" />
              </div>
            </div>

            {/* Setting 9: Service protocol */}
            <div 
              onClick={() => showToast('用户协议已阅。您可通过账号注销及退出随时清除痕迹。')}
              className="h-[56px] px-4 flex items-center justify-between active:bg-slate-50 cursor-pointer transition-colors"
            >
              <div className="flex items-center space-x-3">
                <Lock size={18} className="text-[#4FACFE] stroke-[2.3]" />
                <span className="text-[15px] font-medium text-slate-700">隐私政策</span>
              </div>
              <ChevronRight size={16} className="text-slate-300" />
            </div>

            {/* Setting 10: Privacy */}
            <div 
              onClick={() => showToast('服务协议说明。请规范在合法国画网格道路以及合法的户外路段运动')}
              className="h-[56px] px-4 flex items-center justify-between active:bg-slate-50 cursor-pointer transition-colors"
            >
              <div className="flex items-center space-x-3">
                <FileText size={18} className="text-[#4FACFE] stroke-[2.3]" />
                <span className="text-[15px] font-medium text-slate-700">用户协议</span>
              </div>
              <ChevronRight size={16} className="text-slate-300" />
            </div>
          </div>
        </div>

        {/* 2. BOTTOM CACHE STATISTICS & RESET SYSTEM */}
        <div className="bg-gray-100 h-2.5"></div>
        <div className="flex flex-col items-center justify-center p-6 bg-white border-t border-gray-100">
          <span className="text-[12px] text-slate-400 font-mono">
            缓存：{cacheMemoryMB}MB
          </span>
          <button
            id="btn_clear_cache"
            onClick={clearCacheAction}
            className="text-[12.5px] font-extrabold text-[#4FACFE] mt-2 border border-[#4FACFE]/20 hover:bg-teal-50 px-5 py-2 rounded-full active:scale-95 transition-all outline-none"
          >
            清除缓存
          </button>
        </div>

      </div>

      {/* Language Popup Choice Drawer Sheet */}
      {showLanguageSheet && (
        <div className="absolute inset-0 bg-black/45 backdrop-blur-xs flex items-end justify-center z-40">
          <div className="w-full bg-white rounded-t-[28px] p-5 shadow-2xl flex flex-col space-y-3.5 max-h-[50%] animate-slide-up">
            <h3 className="text-sm font-black text-slate-800 text-center pb-2 border-b">切换显示语言 (Switch Language)</h3>
            {languageOptions.map((locale) => (
              <button
                key={locale}
                onClick={() => {
                  setLanguage(locale);
                  setShowLanguageSheet(false);
                  showToast(
                    locale === 'cn'
                      ? '已切换显示为: 简体中文'
                      : 'Switched language to English',
                  );
                }}
                className={`py-3 rounded-xl font-bold text-xs flex justify-between px-4 ${
                  language === locale ? 'bg-[#4FACFE]/10 text-[#4FACFE]' : 'bg-slate-50 text-slate-700'
                }`}
              >
                <span>{languageLabels[locale] || (locale === 'cn' ? '简体中文 (Chinese Simple)' : 'English')}</span>
                {language === locale && <span>✓</span>}
              </button>
            ))}
            <button 
              onClick={() => setShowLanguageSheet(false)}
              className="py-2 bg-slate-100 text-slate-500 font-bold rounded-xl text-xs text-center"
            >
              返回
            </button>
          </div>
        </div>
      )}

      {/* Map Choice Popup Drawer Sheet */}
      {showMapSheet && (
        <div className="absolute inset-0 bg-black/45 backdrop-blur-xs flex items-end justify-center z-40">
          <div className="w-full bg-white rounded-t-[28px] p-5 shadow-2xl flex flex-col space-y-3.5 max-h-[50%] animate-slide-up">
            <h3 className="text-sm font-black text-slate-800 text-center pb-2 border-b">切换底层地图网样式</h3>
            <button 
              onClick={() => { setMapStyleStyle('light'); setShowMapSheet(false); showToast('地图样式已设置为: 浅色模式'); }}
              className={`py-3 rounded-xl font-bold text-xs flex justify-between px-4 ${mapStyleStyle === 'light' ? 'bg-[#4FACFE]/10 text-[#4FACFE]' : 'bg-slate-50 text-slate-700'}`}
            >
              <span>浅色模式地图 (矢量网格)</span>
              {mapStyleStyle === 'light' && <span>✓</span>}
            </button>
            <button 
              onClick={() => { setMapStyleStyle('satellite'); setShowMapSheet(false); showToast('地图样式已设置为: 遥感卫星高清'); }}
              className={`py-3 rounded-xl font-bold text-xs flex justify-between px-4 ${mapStyleStyle === 'satellite' ? 'bg-[#4FACFE]/10 text-[#4FACFE]' : 'bg-slate-50 text-slate-700'}`}
            >
              <span>遥感卫星高清图 (街道重叠)</span>
              {mapStyleStyle === 'satellite' && <span>✓</span>}
            </button>
            <button 
              onClick={() => setShowMapSheet(false)}
              className="py-2 bg-slate-100 text-slate-500 font-bold rounded-xl text-xs text-center"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* Thickness Choice Popup Drawer Sheet */}
      {showThicknessSheet && (
        <div className="absolute inset-0 bg-black/45 backdrop-blur-xs flex items-end justify-center z-40">
          <div className="w-full bg-white rounded-t-[28px] p-5 shadow-2xl flex flex-col space-y-3.5 max-h-[50%] animate-slide-up">
            <h3 className="text-sm font-black text-slate-800 text-center pb-2 border-b">修改地图发光轨迹线粗细</h3>
            <button 
              onClick={() => { setLineWeightThickness('thin'); setShowThicknessSheet(false); showToast('轨迹线：精致极细'); }}
              className={`py-3 rounded-xl font-bold text-xs flex justify-between px-4 ${lineWeightThickness === 'thin' ? 'bg-[#4FACFE]/10 text-[#4FACFE]' : 'bg-slate-50 text-slate-700'}`}
            >
              <span>精致极细 (1.5px)</span>
              {lineWeightThickness === 'thin' && <span>✓</span>}
            </button>
            <button 
              onClick={() => { setLineWeightThickness('mid'); setShowThicknessSheet(false); showToast('轨迹线：中等大小'); }}
              className={`py-3 rounded-xl font-bold text-xs flex justify-between px-4 ${lineWeightThickness === 'mid' ? 'bg-[#4FACFE]/10 text-[#4FACFE]' : 'bg-slate-50 text-slate-700'}`}
            >
              <span>中等粗细 (3.5px)</span>
              {lineWeightThickness === 'mid' && <span>✓</span>}
            </button>
            <button 
              onClick={() => { setLineWeightThickness('thick'); setShowThicknessSheet(false); showToast('轨迹线：醒目极粗'); }}
              className={`py-3 rounded-xl font-bold text-xs flex justify-between px-4 ${lineWeightThickness === 'thick' ? 'bg-[#4FACFE]/10 text-[#4FACFE]' : 'bg-slate-50 text-[#4FACFE]'}`}
            >
              <span>醒目超粗 (6.0px)</span>
              {lineWeightThickness === 'thick' && <span>✓</span>}
            </button>
            <button 
              onClick={() => setShowThicknessSheet(false)}
              className="py-2 bg-slate-100 text-slate-500 font-bold rounded-xl text-xs text-center"
            >
              取消
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
