/**
 * 应用状态栏组件
 *
 * 手机顶部状态栏：时间、网络信号、WiFi、电量
 * 支持深色/浅色主题切换（编辑器页面为深色）
 *
 * @deprecated 此组件已定义但未被任何地方引用，属于死代码。
 * 待应用实际接入 Capacitor StatusBar 后再启用或删除。
 */
import { Wifi } from 'lucide-react';
import React from 'react';

interface AppStatusBarProps {
  liveTime: string;
  isEditorScreen: boolean;
}

export const AppStatusBar: React.FC<AppStatusBarProps> = ({ liveTime, isEditorScreen }) => {
  return (
    <div
      className={`pt-1 px-6 h-10 flex items-end justify-between text-xs font-bold font-sans z-30 select-none ${
        isEditorScreen ? 'bg-[#1A1A1A] text-white' : 'bg-white text-gray-800'
      }`}
    >
      <div className="flex items-center space-x-1">
        <span className="font-mono tracking-tight text-[11px] leading-none mb-1">{liveTime}</span>
        <span className="text-[8px] opacity-70">5G</span>
      </div>

      <div className="flex items-center space-x-2.5 pb-0.5">
        <div className="flex items-center space-x-0.5">
          <div className="w-0.5 h-1.5 bg-current rounded-full"></div>
          <div className="w-0.5 h-2 bg-current rounded-full"></div>
          <div className="w-0.5 h-2.5 bg-current rounded-full"></div>
          <div className="w-0.5 h-3 bg-current rounded-full"></div>
        </div>
        <Wifi size={11} className="stroke-[2.5]" />
        <div className="flex items-center space-x-0.5 bg-current/15 px-1 py-0.5 rounded-[4px] text-[8px] font-mono leading-none scale-95">
          <span>88%</span>
          <div className="w-2.5 h-1.5 border border-current rounded-xs relative overflow-hidden">
            <div className="absolute inset-y-0 left-0 bg-current" style={{ width: '80%' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};
