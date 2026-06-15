/**
 * 应用视口组件
 *
 * 负责组合屏幕路由器和底部弹窗宿主，构成应用主界面框架
 * - AppScreenRouter：根据 activeScreen 渲染对应屏幕组件
 * - AppBottomSheetHost：图形选择底部弹窗
 */
import React from 'react';
import { ScreenId } from '../types';
import { AppBottomSheetHost } from './layout/AppBottomSheetHost';
import { AppScreenRouter } from './screen-router/AppScreenRouter';

interface AppViewportProps {
  activeScreen: ScreenId;
  selectedShapeId: string;
  isBottomSheetOpen: boolean;
  activeNavbarTab: 'home' | 'traces' | 'profile';
  onSelectShape: (shapeId: string) => void;
  openBottomSheet: () => void;
  setActiveScreen: (screen: ScreenId) => void;
  setActiveNavbarTab: (tab: 'home' | 'traces' | 'profile') => void;
  setIsBottomSheetOpen: (open: boolean) => void;
  onNavigateFromOnboarding: (screen: ScreenId) => void;
  onNavigateFromSplash: (screen: ScreenId) => void;
  onNavigateFromLogin: (screen: ScreenId) => void;
  onNavigateFromProfileOrSettings: (screen: ScreenId) => void;
}

export const AppViewport: React.FC<AppViewportProps> = ({
  activeScreen,
  selectedShapeId,
  isBottomSheetOpen,
  activeNavbarTab,
  onSelectShape,
  openBottomSheet,
  setActiveScreen,
  setActiveNavbarTab,
  setIsBottomSheetOpen,
  onNavigateFromOnboarding,
  onNavigateFromSplash,
  onNavigateFromLogin,
  onNavigateFromProfileOrSettings,
}) => {
  // 关闭底部弹窗但不跳转页面
  const clearBottomSheet = () => {
    setIsBottomSheetOpen(false);
  };

  // 关闭底部弹窗并跳转到参数调节页
  const closeBottomSheet = () => {
    clearBottomSheet();
    setActiveScreen('param_adjust');
  };

  const selectShapeFromBottomSheet = (shapeId: string) => {
    onSelectShape(shapeId);
  };

  return (
    <div id="right_panel" className="w-full min-h-[100dvh] bg-[radial-gradient(circle_at_top,_rgba(79,172,254,0.18),_transparent_34%),linear-gradient(180deg,_#f7fbff_0%,_#ffffff_24%,_#eef7ff_100%)]">
      <div
        id="app_surface"
        className="relative w-full min-h-[100dvh] bg-transparent flex flex-col overflow-hidden pb-[env(safe-area-inset-bottom)]"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-[linear-gradient(180deg,rgba(247,251,255,0.98)_0%,rgba(255,255,255,0.72)_46%,rgba(255,255,255,0)_100%)]" />
        <div className="flex-1 w-full relative flex flex-col bg-transparent overflow-hidden text-slate-900 select-none">
          <AppScreenRouter
            activeScreen={activeScreen}
            selectedShapeId={selectedShapeId}
            activeNavbarTab={activeNavbarTab}
            setActiveScreen={setActiveScreen}
            setActiveNavbarTab={setActiveNavbarTab}
            onNavigateFromOnboarding={onNavigateFromOnboarding}
            onNavigateFromSplash={onNavigateFromSplash}
            onNavigateFromLogin={onNavigateFromLogin}
            onNavigateFromProfileOrSettings={onNavigateFromProfileOrSettings}
            onSelectShape={onSelectShape}
            openBottomSheet={openBottomSheet}
            onSuccessNavigate={clearBottomSheet}
          />

          <AppBottomSheetHost
            selectedShapeId={selectedShapeId}
            isOpen={isBottomSheetOpen}
            onSelect={selectShapeFromBottomSheet}
            onClose={closeBottomSheet}
          />
        </div>
      </div>
    </div>
  );
};
