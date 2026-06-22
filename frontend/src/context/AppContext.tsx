/**
 * TraceCraft 全局应用上下文（AppContext）
 *
 * 拆分来源：App.tsx 中分散的 useState 调用
 * 变更目的：将全局状态集中管理，便于深层组件直接消费而无需层层透传
 *
 * 提供的状态：
 *   - isLoggedIn / hasCompletedOnboarding：认证与引导状态
 *   - generatedRoute / activeSessionId：路线与导航会话状态
 *   - isRouteGenerating / routeGenerationError：路线生成进度与错误
 *   - selectedShapeId / isBottomSheetOpen：UI 状态
 *   - navigateToScreen / setActiveNavbarTab：导航动作
 */
import React, { createContext, useContext, useMemo, useState } from 'react';
import type { GeneratedRoute, ScreenId } from '../types';
import type { NavbarTab } from '../hooks/useScreenNavigation';

export interface AppContextValue {
  // 认证与引导
  isLoggedIn: boolean;
  setIsLoggedIn: React.Dispatch<React.SetStateAction<boolean>>;
  hasCompletedOnboarding: boolean;
  setHasCompletedOnboarding: React.Dispatch<React.SetStateAction<boolean>>;

  // 路线与会话
  generatedRoute: GeneratedRoute | null;
  setGeneratedRoute: React.Dispatch<React.SetStateAction<GeneratedRoute | null>>;
  activeSessionId: string | null;
  setActiveSessionId: React.Dispatch<React.SetStateAction<string | null>>;

  // 路线生成状态
  isRouteGenerating: boolean;
  setIsRouteGenerating: React.Dispatch<React.SetStateAction<boolean>>;
  routeGenerationError: string | null;
  setRouteGenerationError: React.Dispatch<React.SetStateAction<string | null>>;

  // UI 状态
  selectedShapeId: string;
  setSelectedShapeId: React.Dispatch<React.SetStateAction<string>>;
  isBottomSheetOpen: boolean;
  setIsBottomSheetOpen: React.Dispatch<React.SetStateAction<boolean>>;

  // 导航动作（由 App 注入，供深层组件调用）
  navigateToScreen: (screen: ScreenId, options?: { replace?: boolean; resetHistory?: boolean }) => void;
  setActiveNavbarTab: (tab: NavbarTab) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

/** 获取全局应用上下文（必须在 AppProvider 内使用） */
export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}

/** 安全获取全局应用上下文（不抛异常，未在 Provider 内时返回 null） */
export function useAppContextSafe(): AppContextValue | null {
  return useContext(AppContext);
}

interface AppProviderProps {
  children: React.ReactNode;
  navigateToScreen: AppContextValue['navigateToScreen'];
  setActiveNavbarTab: AppContextValue['setActiveNavbarTab'];
}

/**
 * AppContext Provider 组件
 *
 * 管理所有全局状态并提供给子组件树
 * 导航回调通过 props 注入（来自 useScreenNavigation）
 */
export function AppProvider({ children, navigateToScreen, setActiveNavbarTab }: AppProviderProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [generatedRoute, setGeneratedRoute] = useState<GeneratedRoute | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isRouteGenerating, setIsRouteGenerating] = useState(false);
  const [routeGenerationError, setRouteGenerationError] = useState<string | null>(null);
  const [selectedShapeId, setSelectedShapeId] = useState('star');
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);

  const value = useMemo<AppContextValue>(
    () => ({
      isLoggedIn, setIsLoggedIn,
      hasCompletedOnboarding, setHasCompletedOnboarding,
      generatedRoute, setGeneratedRoute,
      activeSessionId, setActiveSessionId,
      isRouteGenerating, setIsRouteGenerating,
      routeGenerationError, setRouteGenerationError,
      selectedShapeId, setSelectedShapeId,
      isBottomSheetOpen, setIsBottomSheetOpen,
      navigateToScreen,
      setActiveNavbarTab,
    }),
    [isLoggedIn, hasCompletedOnboarding, generatedRoute, activeSessionId,
     isRouteGenerating, routeGenerationError, selectedShapeId, isBottomSheetOpen,
     navigateToScreen, setActiveNavbarTab],
  );

  return React.createElement(AppContext.Provider, { value }, children);
}
