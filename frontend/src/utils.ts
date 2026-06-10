/**
 * Shared utility functions for TraceCraft frontend.
 */

/**
 * Lightweight toast notification that appears at the bottom of the screen.
 * Automatically removes itself after 2 seconds.
 */
export function miniToast(msg: string): void {
  const t = document.createElement('div');
  t.className =
    'fixed bottom-20 left-1/2 -translate-x-1/2 bg-slate-900/95 text-slate-100 px-4 py-2 rounded-xl text-xs font-bold shadow-lg z-50 animate-bounce border border-slate-700 whitespace-nowrap';
  t.innerText = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2000);
}
