import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Pause, 
  Play, 
  Square as StopIcon, 
  PenTool, 
  Eraser, 
  Maximize2, 
  Sparkles, 
  RotateCw, 
  Undo 
} from 'lucide-react';
import { ScreenId } from '../types';

/* ==========================================
   Screen 2: Map Navigation Screen (导航界面)
   ========================================== */
interface MapNavigationScreenProps {
  onNavigate: (screen: ScreenId) => void;
  selectedShapeId: string;
}

export const MapNavigationScreen: React.FC<MapNavigationScreenProps> = ({ 
  onNavigate,
  selectedShapeId: _selectedShapeId,
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isVoiceOn, setIsVoiceOn] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(1935); // 约32分15秒
  const [progress, setProgress] = useState(0.64); // 64% progress
  const [deviation, setDeviation] = useState(8); // 8m deviation
  
  // Dynamic state for simulating the runner's path
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
      // Simulate slight variations in deviation meter
      setDeviation(prev => {
        const delta = Math.floor(Math.random() * 5) - 2;
        const newVal = Math.max(0, prev + delta);
        return newVal > 15 ? 10 : newVal;
      });
      // Simulate progress traveling loader
      setProgress(prev => {
        const next = prev + 0.005;
        return next >= 1 ? 0 : next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Pre-drawn star route vertex calculations for blue tracker point
  const starPoints = [
    { x: 125, y: 50 },
    { x: 147, y: 100 },
    { x: 200, y: 104 },
    { x: 160, y: 138 },
    { x: 173, y: 190 },
    { x: 125, y: 160 },
    { x: 77, y: 190 },
    { x: 90, y: 138 },
    { x: 50, y: 104 },
    { x: 103, y: 100 },
  ];

  const getTrackerCoord = () => {
    const numPoints = starPoints.length;
    const pathIndex = progress * numPoints;
    const currentIndex = Math.floor(pathIndex) % numPoints;
    const nextIndex = (currentIndex + 1) % numPoints;
    const ratio = pathIndex - Math.floor(pathIndex);
    
    const p1 = starPoints[currentIndex];
    const p2 = starPoints[nextIndex];
    
    return {
      x: p1.x + (p2.x - p1.x) * ratio,
      y: p1.y + (p2.y - p1.y) * ratio
    };
  };

  const tracker = getTrackerCoord();

  return (
    <div className="flex flex-col h-full bg-slate-100 relative select-none overflow-hidden">
      
      {/* 2.1 SIMULATED VECTOR MAP CANVAS */}
      <div className="absolute inset-0 z-0">
        <svg viewBox="0 0 250 400" className="w-full h-full object-cover">
          {/* Waterway background stream */}
          <rect width="250" height="400" fill="#EAF3FA" />
          
          {/* Parks & Forest zones */}
          <path d="M 0,0 L 80,0 L 100,50 L 50,120 L 0,60 Z" fill="#E6F2ED" opacity="0.8" />
          <path d="M 180,300 L 250,280 L 250,400 L 140,400 Z" fill="#E6F2ED" opacity="0.8" />
          
          {/* Secondary streets grey lines */}
          <path d="M -10,120 Q 120,130 260,110" fill="none" stroke="#FFFFFF" strokeWidth="6" />
          <path d="M -10,120 Q 120,130 260,110" fill="none" stroke="#E1E5EB" strokeWidth="2.5" />

          <path d="M 100,-10 L 110,410" fill="none" stroke="#FFFFFF" strokeWidth="5" />
          <path d="M 100,-10 L 110,410" fill="none" stroke="#E1E5EB" strokeWidth="2" />
          
          <path d="M 30,220 C 130,220 200,180 260,250" fill="none" stroke="#FFFFFF" strokeWidth="6" />
          <path d="M 30,220 C 130,220 200,180 260,250" fill="none" stroke="#E1E5EB" strokeWidth="2.5" />

          {/* Target Star glowing trajectory path */}
          <polygon
            points={starPoints.map(p => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="#FF6B35"
            strokeWidth="4"
            strokeLinejoin="round"
            className="drop-shadow-[0_0_4px_rgba(255,107,53,0.6)]"
          />
          
          {/* Already ran paths (in green) */}
          <polyline
            points={starPoints.slice(0, Math.ceil(progress * starPoints.length)).map(p => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="#10B981"
            strokeWidth="4"
            strokeLinejoin="round"
          />

          {/* Glowing Animated blue running tracking circular point */}
          <g transform={`translate(${tracker.x}, ${tracker.y})`}>
            {/* Pulsing expand wave */}
            <circle r="12" fill="#3B82F6" opacity="0.25" className="animate-ping" style={{ animationDuration: '2s' }} />
            <circle r="6" fill="#FFFFFF" />
            <circle r="4" fill="#1E40AF" />
          </g>

          {/* Tiny Directional arrows on map */}
          <g transform="translate(180, 80) rotate(15)">
            <path d="M -4,0 L 4,0 M 1,-3 L 4,0 L 1,3" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
          </g>
          <g transform="translate(70, 160) rotate(210)">
            <path d="M -4,0 L 4,0 M 1,-3 L 4,0 L 1,3" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
          </g>
        </svg>
      </div>

      {/* 2.2 TOP FROSTED BLUR BAR */}
      <div className="absolute top-4 left-4 right-4 z-10 bg-white/70 backdrop-blur-md border border-white/20 rounded-2xl py-3 px-4 flex items-center justify-between shadow-xs">
        <div>
          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">剩余距离</span>
          <span className="text-[15px] font-extrabold text-gray-800">
            {isPlaying ? (3.2 * (1 - progress)).toFixed(2) : '2.3'}km
          </span>
        </div>
        <div className="text-right">
          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">偏差</span>
          <span className={`text-[13px] font-bold ${deviation > 10 ? 'text-red-500' : 'text-emerald-600'}`}>
偏差 {deviation}m
          </span>
        </div>
      </div>

      {/* 2.3 FLOATING DIRECTIVE BANNER */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10 bg-linear-to-r from-blue-600/90 to-[#4FACFE]/90 text-white text-[11px] font-semibold px-3.5 py-1.5 rounded-full shadow-md flex items-center space-x-1.5 animate-bounce">
        <span>⚡</span>
        <span>直行 150m 后右转跑</span>
      </div>

      {/* 2.4 RIGHT LOWER CORNER MINI STATS HUD */}
      <div className="absolute bottom-32 right-4 z-10 bg-gray-900/80 backdrop-blur-md border border-gray-800 rounded-xl p-3 text-left shadow-lg text-white max-w-[90px]">
        <div className="mb-1.5">
          <p className="text-[9px] uppercase text-gray-400 leading-none">实时配速</p>
          <p className="font-mono text-xs font-bold mt-0.5">6:15/km</p>
        </div>
        <div>
          <p className="text-[9px] uppercase text-gray-400 leading-none">当前心率</p>
          <p className="font-mono text-xs font-bold text-emerald-400 flex items-center mt-0.5">
            ❤️ {138 + Math.floor(Math.random() * 8)}
          </p>
        </div>
      </div>

      {/* 2.5 BOTTOM FROSTED BLUR CONTROL HUD */}
      <div className="absolute bottom-4 left-4 right-4 z-10 bg-white/75 backdrop-blur-lg border border-white/30 rounded-3xl p-5 shadow-lg">
        {/* Progress horizontal slider bar */}
        <div className="w-full bg-gray-200/50 rounded-full h-1 mb-4 relative overflow-hidden">
          <div 
            className="bg-linear-to-r from-[#4FACFE] to-[#00F2FE] h-full transition-all duration-500" 
            style={{ width: `${progress * 100}%` }}
          ></div>
        </div>

        {/* Dynamic distance running meter */}
        <div className="flex justify-between items-center mb-4">
          <div className="text-left">
            <span className="text-[20px] font-extrabold text-gray-800">
              {(3.2 * progress).toFixed(2)}
            </span>
            <span className="text-xs text-gray-400 ml-0.5">km已跑</span>
          </div>
          <div className="text-right">
            <span className="text-[16px] font-semibold text-gray-600 font-mono">
              {formatTime(elapsedSeconds)}
            </span>
            <span className="text-[10px] text-gray-400 block">用时</span>
          </div>
        </div>

        {/* Controls layout */}
        <div className="flex items-center justify-between px-2">
          {/* Pause / Play */}
          <button
            onMouseUp={() => setIsPlaying(!isPlaying)}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
              isPlaying 
                ? 'bg-amber-100 text-amber-600 hover:bg-amber-200 active:scale-95' 
                : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200 active:scale-95'
            }`}
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} className="fill-emerald-600 ml-0.5" />}
          </button>

          {/* Stop / Complete */}
          <button
            onMouseUp={() => onNavigate('success')}
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-md shadow-red-500/30 active:scale-95 transition-transform"
          >
            <StopIcon size={24} className="fill-white" />
          </button>

          {/* Voice Toggle */}
          <button
            onMouseUp={() => setIsVoiceOn(!isVoiceOn)}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
              isVoiceOn 
                ? 'bg-linear-to-r from-[#4FACFE] to-[#00F2FE] text-white' 
                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
            }`}
          >
            {isVoiceOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        </div>
      </div>

    </div>
  );
};


/* ==========================================
   Screen 7: Parameter Adjustment Screen (参数调节界面)
   ========================================== */
interface ParamAdjustScreenProps {
  onNavigate: (screen: ScreenId) => void;
  selectedShapeId: string;
}

export const ParamAdjustScreen: React.FC<ParamAdjustScreenProps> = ({ 
  onNavigate,
  selectedShapeId,
}) => {
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
        <span className="text-base font-bold text-gray-800">图形参数调节</span>
        <button 
          onClick={() => { setScale(1.5); setRotate(45); setStretch(1.0); }}
          className="text-xs font-semibold text-[#4FACFE] active:opacity-75"
        >
          重置
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
            <span className="text-[9px] font-bold text-gray-500">大小</span>
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
            <span className="text-[9px] font-bold text-gray-500">旋转</span>
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
            <span className="text-[9px] font-bold text-gray-500">拉伸</span>
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
            预计长度: <strong className="text-gray-800 font-extrabold">{calculatedLength} km</strong>
          </span>
          <span className="text-[11px] text-teal-600 font-semibold bg-teal-50 px-2 py-0.5 rounded-full">
            1:1 等比匹配
          </span>
        </div>

        {/* Draggable Target Distance Slider */}
        <div className="bg-gray-50/50 p-2.5 rounded-xl border border-gray-100">
          <div className="flex justify-between text-[11px] text-gray-400 mb-1">
            <span>目标距离</span>
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
          onClick={() => onNavigate('loading')}
          className="w-full py-3.5 rounded-[32px] bg-linear-to-r from-[#4FACFE] to-[#00F2FE] hover:brightness-105 active:scale-98 transition-all text-white font-extrabold text-[15px] shadow-md shadow-blue-500/20 text-center"
        >
          应用并开始导航
        </button>
      </div>

    </div>
  );
};


/* ==========================================
   Screen 4: Manual Tracing Editor (描边编辑界面)
   ========================================== */
interface TraceEditorScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

export const TraceEditorScreen: React.FC<TraceEditorScreenProps> = ({ 
  onNavigate 
}) => {
  const [brushSize, setBrushSize] = useState(6); // width tracker
  const [activeTool, setActiveTool] = useState<'draw' | 'erase' | 'smooth'>('draw');
  
  // Custom drawn strokes for manual corrections!
  const [lines, setLines] = useState<Array<Array<{x: number, y: number}>>>([
    // Starter pre-guided panda layout lines
    [
      { x: 50, y: 70 }, { x: 55, y: 55 }, { x: 74, y: 48 }, { x: 90, y: 56 },
      { x: 104, y: 72 }, { x: 106, y: 92 }, { x: 92, y: 110 }
    ],
    [
      { x: 154, y: 70 }, { x: 149, y: 55 }, { x: 130, y: 48 }, { x: 114, y: 56 },
      { x: 100, y: 72 }, { x: 98, y: 92 }, { x: 112, y: 110 }
    ]
  ]);
  const [currentLine, setCurrentLine] = useState<Array<{x: number, y: number}>>([]);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Undo/redo logs trace
  const [history, setHistory] = useState<Array<typeof lines>>([]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Save current backup to history first
    setHistory([...history, lines]);
    setCurrentLine([{ x, y }]);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (currentLine.length === 0 || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (activeTool === 'erase') {
      // Find and remove points close to cursor
      setLines(lines.map(line => 
        line.filter(p => Math.hypot(p.x - x, p.y - y) > brushSize * 2)
      ).filter(line => line.length > 0));
    } else {
      setCurrentLine([...currentLine, { x, y }]);
    }
  };

  const handlePointerUp = () => {
    if (activeTool === 'draw' && currentLine.length > 0) {
      setLines([...lines, currentLine]);
    }
    setCurrentLine([]);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setHistory(history.slice(0, -1));
    setLines(last);
  };

  const handleAutoOptimize = () => {
    // Smooth points by averaging neighbors
    const smoothed = lines.map(line => {
      if (line.length < 3) return line;
      return line.map((p, idx) => {
        if (idx === 0 || idx === line.length - 1) return p;
        const prev = line[idx - 1];
        const next = line[idx + 1];
        return {
          x: (prev.x + p.x + next.x) / 3,
          y: (prev.y + p.y + next.y) / 3,
        };
      });
    });
    setHistory([...history, lines]);
    setLines(smoothed);
  };

  return (
    <div className="flex flex-col h-full bg-[#1E1E1E] text-white select-none relative">
      
      {/* 4.1 TOP ACTION BAR */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3 bg-[#1A1A1A] border-b border-gray-800">
        <button onClick={() => onNavigate('home')} className="p-1.5 rounded-full text-gray-400 active:text-white transition-colors">
          <ArrowLeft size={19} />
        </button>
        <span className="text-base font-bold text-white tracking-wide">编辑轨迹</span>
        <button 
          onClick={() => onNavigate('loading')} 
          className="text-xs font-bold text-[#4FACFE] bg-[#4FACFE]/10 px-3 py-1.5 rounded-full hover:bg-[#4FACFE]/20 active:opacity-75 transition-colors"
        >
          保存
        </button>
      </div>

      {/* 4.2 INTERACTIVE CANVAS WORKSPACE */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center p-2 bg-[#121212]">
        
        {/* Draw Area Box */}
        <div 
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="relative w-full h-[330px] bg-[#1a1a1a]/80 rounded-[20px] shadow-inner overflow-hidden cursor-crosshair border border-gray-800/60"
        >
          {/* Half transparent Panda outline background image (represented via vector SVG) */}
          <div className="absolute inset-0 flex items-center justify-center opacity-25 pointer-events-none p-6">
            <svg viewBox="0 0 100 100" className="w-full h-full text-white overflow-visible">
              {/* Outer Head circle outline */}
              <circle cx="50" cy="55" r="34" stroke="currentColor" strokeWidth="2" fill="none" />
              {/* Ears */}
              <circle cx="21" cy="27" r="13" stroke="currentColor" strokeWidth="2" fill="none" />
              <circle cx="79" cy="27" r="13" stroke="currentColor" strokeWidth="2" fill="none" />
              {/* Eye patches */}
              <ellipse cx="38" cy="51" rx="8" ry="11" transform="rotate(-15, 38, 51)" stroke="currentColor" strokeWidth="1.5" fill="none" />
              <ellipse cx="62" cy="51" rx="8" ry="11" transform="rotate(15, 62, 51)" stroke="currentColor" strokeWidth="1.5" fill="none" />
              {/* Nose and mouth base */}
              <ellipse cx="50" cy="67" rx="6" ry="4" stroke="currentColor" strokeWidth="1.5" fill="none" />
              <path d="M 50,71 Q 50,74 46,75 M 50,71 Q 50,74 54,75" stroke="currentColor" strokeWidth="1.5" fill="none" />
            </svg>
          </div>

          {/* SVG Line Tracks Layer */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {/* Draw permanent paths */}
            {lines.map((line, idx) => (
              <polyline
                key={idx}
                points={line.map(p => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke="#FF6B35"
                strokeWidth={brushSize}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="drop-shadow-[0_0_4px_rgba(255,107,53,0.5)]"
                strokeDasharray="4 3"
              />
            ))}

            {/* Current Active drawing trail */}
            {currentLine.length > 0 && (
              <polyline
                points={currentLine.map(p => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke="#FF6B35"
                strokeWidth={brushSize}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="4 3"
              />
            )}
          </svg>

          {/* Small Simulated Finger indicator helping touch cues */}
          <div className="absolute top-[82px] left-[78px] text-[15px] pointer-events-none animate-pulse">
            馃憜 <span className="bg-orange-500 text-white text-[8px] px-1 py-0.5 rounded ml-1 font-bold">手势微调中</span>
          </div>
        </div>

        {/* 4.3 FLOATING BRUSH RANGE SLIDER (RIGHT) */}
        <div className="absolute right-3.5 top-8 bottom-8 w-11 bg-[#1F1F1F]/90 backdrop-blur-md rounded-2xl border border-gray-800 flex flex-col justify-around items-center p-2 z-10">
          <span className="text-[9px] font-bold text-gray-400">笔刷</span>
          <div className="relative h-20 flex items-center justify-center">
            <input 
              type="range" 
              min="2" 
              max="20"
              value={brushSize} 
              onChange={(e) => setBrushSize(parseInt(e.target.value))}
              className="accent-[#4FACFE] cursor-pointer h-1.5 w-16 -rotate-90 appearance-none bg-gray-700 rounded-full"
            />
          </div>
          <span className="text-[10px] text-gray-300 font-mono font-bold">{brushSize}px</span>
        </div>

        {/* 4.4 FLOATING CHIP OPTIMIZER (TOP RIGHT) */}
        <button
          onClick={handleAutoOptimize}
          className="absolute top-4 left-4 text-xs font-bold bg-[#3B82F6] hover:bg-blue-600 active:scale-95 transition-all text-white px-3 py-1.5 rounded-full flex items-center space-x-1 shadow-md shadow-blue-900/30"
        >
          <Sparkles size={11} />
          <span>自动优化</span>
        </button>
      </div>

      {/* 4.5 GLASSY TOOLS TOOLBAR (BOTTOM BAR) */}
      <div className="bg-[#1A1A1A] border-t border-gray-800/80 px-4 py-4 flex flex-col space-y-4">
        {/* Five sub-tools row */}
        <div className="grid grid-cols-5 gap-1.5 bg-[#252525]/80 p-1.5 rounded-2xl border border-gray-800">
          <button
            onClick={() => setActiveTool('draw')}
            className={`flex flex-col items-center justify-center py-2.5 rounded-xl transition-all ${
              activeTool === 'draw' ? 'bg-[#4FACFE] text-white shadow-md' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <PenTool size={16} />
            <span className="text-[9px] mt-1 font-medium">绘制</span>
          </button>

          <button
            onClick={() => setActiveTool('erase')}
            className={`flex flex-col items-center justify-center py-2.5 rounded-xl transition-all ${
              activeTool === 'erase' ? 'bg-[#E11D48] text-white shadow-md' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Eraser size={16} />
            <span className="text-[9px] mt-1 font-medium">擦除</span>
          </button>

          <button
            onClick={() => setActiveTool('smooth')}
            className={`flex flex-col items-center justify-center py-2.5 rounded-xl transition-all ${
              activeTool === 'smooth' ? 'bg-[#3BAC6A] text-white shadow-md' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Maximize2 size={16} />
            <span className="text-[9px] mt-1 font-medium">平滑</span>
          </button>

          <button
            onClick={handleUndo}
            disabled={history.length === 0}
            className="flex flex-col items-center justify-center py-2.5 rounded-xl text-gray-400 hover:text-gray-200 hover:bg-white/5 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-transform"
          >
            <Undo size={16} />
            <span className="text-[9px] mt-1 font-medium">撤销</span>
          </button>

          <button
            onClick={() => {
              // Stub clear action as redo
              setHistory([...history, lines]);
              setLines([]);
            }}
            className="flex flex-col items-center justify-center py-2.5 rounded-xl text-gray-400 hover:text-gray-200 hover:bg-white/5 active:scale-95 transition-transform"
          >
            <RotateCcw size={16} />
            <span className="text-[9px] mt-1 font-medium">重置</span>
          </button>
        </div>

        {/* Big submit green button */}
        <button
          onClick={() => onNavigate('loading')}
          className="w-full py-3.5 rounded-[32px] bg-emerald-500 hover:bg-emerald-600 active:scale-98 transition-all text-white font-extrabold text-[15px] shadow-lg shadow-emerald-950/20 text-center"
        >
          确认路线
        </button>
      </div>

    </div>
  );
};

