/**
 * 图形选择弹窗组件
 *
 * 从 CommonModals.tsx 中拆分，避免 AppScreenRouter 和 AppBottomSheetHost
 * 对同一模块的静态/动态混合导入冲突。
 */
import React from 'react';
import { Check, Circle, Square, Triangle, Star, Heart, Plus } from 'lucide-react';

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
    </div>
  );
};
