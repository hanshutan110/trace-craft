/**
 * 全局统一 Toast 组件
 *
 * 提供 ToastProvider 和 useToast Hook，替代各组件内分散的 toast 实现。
 * 用法：在 App.tsx 中包裹 <ToastProvider>，子组件通过 useToast() 调用 showToast()。
 * App.tsx 自身的回调函数（如 handleGenerateTemplateRoute）因不在 Provider 内部，
 * 继续使用 utils.ts 中的 miniToast() 作为后备。
 */
import React, { createContext, useCallback, useContext, useState } from 'react';

interface ToastItem {
  id: number;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
});

let toastIdCounter = 0;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string) => {
    const id = ++toastIdCounter;
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast overlay - fixed to viewport */}
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-slate-900/95 text-slate-100 px-4 py-2 rounded-xl text-xs font-bold shadow-lg z-[100] border border-slate-700 whitespace-nowrap animate-bounce pointer-events-none"
        >
          {toast.message}
        </div>
      ))}
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
