/**
 * TraceCraft 前端通用工具函数
 */

/**
 * 全局轻量级 Toast 提示
 *
 * 在屏幕底部显示一条短暂消息，2 秒后自动消失。
 *
 * 定位：React 组件树外部（如 App.tsx 回调、异步任务）的全局后备方案。
 * 组件树内部优先使用 ToastProvider/useToast() Hook（位于 components/common/Toast.tsx）。
 */
export function miniToast(msg: string): void {
  const t = document.createElement('div');
  t.className =
    'fixed bottom-20 left-1/2 -translate-x-1/2 bg-slate-900/95 text-slate-100 px-4 py-2 rounded-xl text-xs font-bold shadow-lg z-50 animate-bounce border border-slate-700 whitespace-nowrap';
  t.innerText = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2000);
}
