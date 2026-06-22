/**
 * TraceCraft 离线指示器组件
 *
 * 拆分来源：新增组件
 * 变更目的：当用户断网时显示浮动提示条，恢复网络后自动隐藏
 *
 * 特性：
 *   - 使用 useOnline Hook 监听网络状态
 *   - 断网时顶部滑入红色提示条
 *   - 恢复网络后延迟 1.5s 自动消失（避免闪烁）
 */
import { useEffect, useState } from 'react';
import { useOnline } from '../../services/offlineStore';

export function OfflineIndicator() {
  const online = useOnline();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!online) {
      setVisible(true);
    } else {
      // 恢复网络后延迟隐藏，避免快速切换导致闪烁
      const timer = setTimeout(() => setVisible(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [online]);

  if (!visible) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium transition-all duration-300 ${
        online
          ? 'bg-emerald-600 text-white translate-y-0'
          : 'bg-red-600 text-white translate-y-0'
      }`}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {online ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 11-12.728 0M12 9v4m0 4h.01" />
        )}
      </svg>
      <span>{online ? '网络已恢复' : '当前无网络连接，部分功能可能无法使用'}</span>
    </div>
  );
}
