/**
 * TraceEditorScreen - 描边编辑界面
 *
 * 从原 NavigationAndEditor.tsx 拆分而来。
 * 功能：手动描边轨迹编辑器
 * - 画布绑定指针事件（绘制/擦除/平滑）
 * - 笔刷大小滑块 (2-20px)
 * - 撤销/重做历史管理（ref 驱动避免双重状态）
 * - 自动优化：邻点平均平滑算法
 * - 底部工具栏（绘制/擦除/平滑/撤销/重置）
 *
 * @source 拆分自 components/NavigationAndEditor.tsx
 */
import React, { useState, useRef } from 'react';
import { 
  ArrowLeft,
  PenTool, 
  Eraser, 
  Maximize2, 
  Sparkles, 
  RotateCcw,
  Undo
} from 'lucide-react';
import { ScreenId } from '../../types';
import { useI18n } from '../../i18n';

interface TraceEditorScreenProps {
  onNavigate: (screen: ScreenId) => void;
  onGenerateTemplateRoute: (shapeId: string, targetKm?: number) => Promise<void>;
  selectedShapeId: string;
}

type Point = { x: number; y: number };
type Stroke = Point[];

const INITIAL_STROKES: Stroke[] = [
  // Starter pre-guided panda layout lines
  [
    { x: 50, y: 70 }, { x: 55, y: 55 }, { x: 74, y: 48 }, { x: 90, y: 56 },
    { x: 104, y: 72 }, { x: 106, y: 92 }, { x: 92, y: 110 }
  ],
  [
    { x: 154, y: 70 }, { x: 149, y: 55 }, { x: 130, y: 48 }, { x: 114, y: 56 },
    { x: 100, y: 72 }, { x: 98, y: 92 }, { x: 112, y: 110 }
  ]
];

export const TraceEditorScreen: React.FC<TraceEditorScreenProps> = ({ 
  onNavigate,
  onGenerateTemplateRoute,
  selectedShapeId,
}) => {
  const { text } = useI18n();
  const [brushSize, setBrushSize] = useState(6); // width tracker
  const [activeTool, setActiveTool] = useState<'draw' | 'erase' | 'smooth'>('draw');
  // 使用 ref 作为单一数据源，避免 useState + useRef 双重状态管理
  const canvasRef = useRef<HTMLDivElement>(null);
  const linesRef = useRef<Stroke[]>(INITIAL_STROKES);
  const historyRef = useRef<Stroke[][]>([]);
  const currentLineRef = useRef<Stroke>([]);
  // 渲染触发器：ref 变化后需要强制重渲染
  const [, setRenderTick] = useState(0);
  const rerender = () => setRenderTick(t => t + 1);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Save current backup to history first.
    const nextHistory = [...historyRef.current, linesRef.current];
    historyRef.current = nextHistory;

    currentLineRef.current = [{ x, y }];
    rerender();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (currentLineRef.current.length === 0 || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (activeTool === 'erase') {
      // Find and remove points close to cursor
      linesRef.current = linesRef.current
        .map((line) => line.filter((p) => Math.hypot(p.x - x, p.y - y) > brushSize * 2))
        .filter((line) => line.length > 0);
    } else {
      currentLineRef.current = [...currentLineRef.current, { x, y }];
    }
    rerender();
  };

  const handlePointerUp = () => {
    if (activeTool === 'draw' && currentLineRef.current.length > 0) {
      linesRef.current = [...linesRef.current, currentLineRef.current];
    }
    currentLineRef.current = [];
    rerender();
  };

  const handleUndo = () => {
    if (historyRef.current.length === 0) return;
    const last = historyRef.current[historyRef.current.length - 1];
    historyRef.current = historyRef.current.slice(0, -1);
    linesRef.current = last;
    rerender();
  };

  const handleAutoOptimize = () => {
    // Smooth points by averaging neighbors
    linesRef.current = linesRef.current.map((line) => {
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
    historyRef.current = [...historyRef.current, linesRef.current];
    rerender();
  };

  return (
    <div className="flex flex-col h-full bg-[#1E1E1E] text-white select-none relative">
      
      {/* 4.1 TOP ACTION BAR */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3 bg-[#1A1A1A] border-b border-gray-800">
        <button onClick={() => onNavigate('home')} className="p-1.5 rounded-full text-gray-400 active:text-white transition-colors">
          <ArrowLeft size={19} />
        </button>
        <span className="text-base font-bold text-white tracking-wide">{text('编辑轨迹', 'Edit Route')}</span>
        <button 
          onClick={() => void onGenerateTemplateRoute(selectedShapeId)} 
          className="text-xs font-bold text-[#4FACFE] bg-[#4FACFE]/10 px-3 py-1.5 rounded-full hover:bg-[#4FACFE]/20 active:opacity-75 transition-colors"
        >
          {text('保存', 'Save')}
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
            {linesRef.current.map((line, idx) => (
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
            {currentLineRef.current.length > 0 && (
              <polyline
                points={currentLineRef.current.map(p => `${p.x},${p.y}`).join(' ')}
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
            👆 <span className="bg-orange-500 text-white text-[8px] px-1 py-0.5 rounded ml-1 font-bold">{text('手势微调中', 'Fine-tuning')}</span>
          </div>
        </div>

        {/* 4.3 FLOATING BRUSH RANGE SLIDER (RIGHT) */}
        <div className="absolute right-3.5 top-8 bottom-8 w-11 bg-[#1F1F1F]/90 backdrop-blur-md rounded-2xl border border-gray-800 flex flex-col justify-around items-center p-2 z-10">
          <span className="text-[9px] font-bold text-gray-400">{text('笔刷', 'Brush')}</span>
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
          <span>{text('自动优化', 'Auto Optimize')}</span>
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
            <span className="text-[9px] mt-1 font-medium">{text('绘制', 'Draw')}</span>
          </button>

          <button
            onClick={() => setActiveTool('erase')}
            className={`flex flex-col items-center justify-center py-2.5 rounded-xl transition-all ${
              activeTool === 'erase' ? 'bg-[#E11D48] text-white shadow-md' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Eraser size={16} />
            <span className="text-[9px] mt-1 font-medium">{text('擦除', 'Erase')}</span>
          </button>

          <button
            onClick={() => setActiveTool('smooth')}
            className={`flex flex-col items-center justify-center py-2.5 rounded-xl transition-all ${
              activeTool === 'smooth' ? 'bg-[#3BAC6A] text-white shadow-md' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Maximize2 size={16} />
            <span className="text-[9px] mt-1 font-medium">{text('平滑', 'Smooth')}</span>
          </button>

          <button
            onClick={handleUndo}
            disabled={historyRef.current.length === 0}
            className="flex flex-col items-center justify-center py-2.5 rounded-xl text-gray-400 hover:text-gray-200 hover:bg-white/5 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-transform"
          >
            <Undo size={16} />
            <span className="text-[9px] mt-1 font-medium">{text('撤销', 'Undo')}</span>
          </button>

          <button
            onClick={() => {
              // Clear canvas but keep a recoverable snapshot in history.
              historyRef.current = [...historyRef.current, linesRef.current];
              linesRef.current = [];
              currentLineRef.current = [];
              rerender();
            }}
            className="flex flex-col items-center justify-center py-2.5 rounded-xl text-gray-400 hover:text-gray-200 hover:bg-white/5 active:scale-95 transition-transform"
          >
            <RotateCcw size={16} />
            <span className="text-[9px] mt-1 font-medium">{text('重置', 'Reset')}</span>
          </button>
        </div>

        {/* Big submit green button */}
        <button
          onClick={() => void onGenerateTemplateRoute(selectedShapeId)}
          className="w-full py-3.5 rounded-[32px] bg-emerald-500 hover:bg-emerald-600 active:scale-98 transition-all text-white font-extrabold text-[15px] shadow-lg shadow-emerald-950/20 text-center"
        >
          {text('确认路线', 'Confirm Route')}
        </button>
      </div>

    </div>
  );
};
