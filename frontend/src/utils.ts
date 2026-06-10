/**
 * TraceCraft 前端通用工具函数
 */

/**
 * 轻量级 Toast 提示
 * 在屏幕底部显示一条短暂消息，2 秒后自动消失
 * 用于替代 alert()，提供更友好的用户反馈
 */
export function miniToast(msg: string): void {
  const t = document.createElement('div');
  t.className =
    'fixed bottom-20 left-1/2 -translate-x-1/2 bg-slate-900/95 text-slate-100 px-4 py-2 rounded-xl text-xs font-bold shadow-lg z-50 animate-bounce border border-slate-700 whitespace-nowrap';
  t.innerText = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2000);
}
