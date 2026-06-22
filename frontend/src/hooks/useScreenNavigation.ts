/**
 * 屏幕导航 Hook
 *
 * 管理应用内屏幕切换、导航历史栈和底部导航栏标签页联动
 * 支持 Capacitor 硬件返回键处理（Android 物理返回）
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import type { ScreenId } from '../types';

/** 底部导航栏标签页 */
export type NavbarTab = 'home' | 'traces' | 'profile';

/** 导航选项 */
export interface NavigateOptions {
  replace?: boolean;       // 替换当前屏幕（不入栈）
  resetHistory?: boolean;  // 清空历史栈
}

/** 根据屏幕 ID 自动匹配对应的导航栏标签页 */
function navbarTabForScreen(screen: ScreenId): NavbarTab | null {
  if (screen === 'home' || screen === 'editor' || screen === 'nav' || screen === 'param_adjust' || screen === 'route_preview' || screen === 'quick_cards' || screen === 'library' || screen === 'success' || screen === 'loading') {
    return 'home';
  }
  if (screen === 'my_traces' || screen === 'trace_detail' || screen === 'run_history' || screen === 'run_detail') {
    return 'traces';
  }
  if (screen === 'profile' || screen === 'settings' || screen === 'privacy_policy' || screen === 'user_agreement' || screen === 'permission_notice') {
    return 'profile';
  }
  return null;
}

/**
 * 屏幕导航 Hook
 * @param params.initialScreen - 初始屏幕 ID
 * @param params.isBottomSheetOpen - 底部弹窗是否打开
 * @param params.closeBottomSheet - 关闭底部弹窗的回调
 */
export function useScreenNavigation(params: {
  initialScreen: ScreenId;
  isBottomSheetOpen: boolean;
  closeBottomSheet: () => void;
}) {
  const { initialScreen, isBottomSheetOpen, closeBottomSheet } = params;
  const [activeScreen, setActiveScreenState] = useState<ScreenId>(initialScreen);
  const [activeNavbarTab, setActiveNavbarTabState] = useState<NavbarTab>('home');
  const screenHistoryRef = useRef<ScreenId[]>([]);
  const isBottomSheetOpenRef = useRef<boolean>(isBottomSheetOpen);

  const syncNavbarTab = useCallback((screen: ScreenId) => {
    const tab = navbarTabForScreen(screen);
    if (tab) setActiveNavbarTabState(tab);
  }, []);

  const navigateToScreen = useCallback((screen: ScreenId, options?: NavigateOptions) => {
    setActiveScreenState((currentScreen) => {
      if (options?.resetHistory) {
        screenHistoryRef.current = [];
      }
      if (currentScreen === screen) return currentScreen;
      if (!options?.replace) {
        screenHistoryRef.current.push(currentScreen);
      }
      return screen;
    });
    syncNavbarTab(screen);
  }, [syncNavbarTab]);

  useEffect(() => {
    isBottomSheetOpenRef.current = isBottomSheetOpen;
  }, [isBottomSheetOpen]);

  useEffect(() => {
    let removeListener: (() => void) | undefined;
    const setupBackButton = async () => {
      try {
        const handle = await CapacitorApp.addListener('backButton', () => {
          if (isBottomSheetOpenRef.current) {
            closeBottomSheet();
            return;
          }
          const previousScreen = screenHistoryRef.current.pop();
          if (previousScreen) {
            setActiveScreenState(previousScreen);
            syncNavbarTab(previousScreen);
            return;
          }
          void CapacitorApp.exitApp();
        });
        removeListener = () => {
          void handle.remove();
        };
      } catch {
        // Web 预览或非 Android 环境没有 Capacitor backButton，忽略即可。
      }
    };
    void setupBackButton();
    return () => {
      removeListener?.();
    };
  }, [closeBottomSheet, syncNavbarTab]);

  return {
    activeScreen,
    activeNavbarTab,
    setActiveNavbarTab: setActiveNavbarTabState,
    navigateToScreen,
  };
}
