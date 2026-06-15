/**
 * TraceCraft 应用根组件
 *
 * 核心职责：
 *   1. 管理全局状态：当前屏幕、选中图形、底部弹窗、导航栏标签页
 *   2. 管理用户引导流程：首次引导（onboarding）→ 登录 → 主页
 *   3. 持久化 onboarding/login 状态到 localStorage，重启后恢复
 *   4. 包装 I18nProvider 提供国际化支持
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { App as CapacitorApp } from '@capacitor/app';

import { GeneratedRoute, ScreenId } from './types';
import { AppViewport } from './components/AppViewport';
import { I18nProvider } from './i18n';
import { createImageRoute, createTemplateRoute, startRoute } from './api/routes';
import { miniToast } from './utils';

// localStorage 持久化键名（移至组件外部，避免每次渲染重新创建）
const STORAGE_KEYS = {
  onboardingDone: 'tracecraft_onboarding_done',
  isLoggedIn: 'tracecraft_is_logged_in',
} as const;

export default function App() {

  // 当前激活的屏幕 ID
  const [activeScreen, setActiveScreenState] = useState<ScreenId>('splash');
  // 当前选中的图形模板 ID
  const [selectedShapeId, setSelectedShapeId] = useState<string>('star');
  // 底部弹窗是否打开
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState<boolean>(false);
  // 底部导航栏当前标签页
  const [activeNavbarTab, setActiveNavbarTabState] = useState<'home' | 'traces' | 'profile'>('home');
  // 会话是否就绪（初始化完成后置 true）
  const [isSessionReady, setIsSessionReady] = useState<boolean>(false);
  // 是否已完成首次引导
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean>(false);
  // 是否已登录
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [generatedRoute, setGeneratedRoute] = useState<GeneratedRoute | null>(null);
  const [isRouteGenerating, setIsRouteGenerating] = useState<boolean>(false);
  const [routeGenerationError, setRouteGenerationError] = useState<string | null>(null);
  // 记录页面返回栈，给安卓返回键/右滑返回用
  const screenHistoryRef = useRef<ScreenId[]>([]);
  const isBottomSheetOpenRef = useRef<boolean>(false);

  const syncNavbarTab = useCallback((screen: ScreenId) => {
    if (screen === 'home' || screen === 'editor' || screen === 'nav' || screen === 'param_adjust' || screen === 'route_preview' || screen === 'quick_cards' || screen === 'library' || screen === 'success' || screen === 'loading') {
      setActiveNavbarTabState('home');
      return;
    }

    if (screen === 'my_traces' || screen === 'trace_detail' || screen === 'run_history' || screen === 'run_detail') {
      setActiveNavbarTabState('traces');
      return;
    }

    if (screen === 'profile' || screen === 'settings') {
      setActiveNavbarTabState('profile');
    }
  }, []);

  const navigateToScreen = useCallback((screen: ScreenId, options?: { replace?: boolean; resetHistory?: boolean }) => {
    setActiveScreenState((currentScreen) => {
      if (options?.resetHistory) {
        screenHistoryRef.current = [];
      }

      if (currentScreen === screen) {
        return currentScreen;
      }

      if (!options?.replace) {
        screenHistoryRef.current.push(currentScreen);
      }

      return screen;
    });

    syncNavbarTab(screen);
  }, [syncNavbarTab]);

  // 从 localStorage 恢复引导和登录状态
  useEffect(() => {
    try {
      const onboardingDone = localStorage.getItem(STORAGE_KEYS.onboardingDone) === '1';
      const loggedIn = localStorage.getItem(STORAGE_KEYS.isLoggedIn) === '1';
      setHasCompletedOnboarding(onboardingDone);
      setIsLoggedIn(loggedIn);
    } catch {
      setHasCompletedOnboarding(false);
      setIsLoggedIn(false);
    }
    setIsSessionReady(true);
  }, []);

  // 将引导和登录状态持久化到 localStorage
  useEffect(() => {
    if (!isSessionReady) return;
    try {
      localStorage.setItem(STORAGE_KEYS.onboardingDone, hasCompletedOnboarding ? '1' : '0');
      localStorage.setItem(STORAGE_KEYS.isLoggedIn, isLoggedIn ? '1' : '0');
    } catch {
      // Ignore storage errors and keep UI state in memory.
    }
  }, [isSessionReady, hasCompletedOnboarding, isLoggedIn]);

  useEffect(() => {
    isBottomSheetOpenRef.current = isBottomSheetOpen;
  }, [isBottomSheetOpen]);

  useEffect(() => {
    let removeListener: (() => void) | undefined;

    const setupBackButton = async () => {
      try {
        const handle = await CapacitorApp.addListener('backButton', () => {
          if (isBottomSheetOpenRef.current) {
            setIsBottomSheetOpen(false);
            return;
          }

          const history = screenHistoryRef.current;
          if (history.length > 0) {
            const previousScreen = history.pop() as ScreenId;
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
        // 本地 Web 预览或非 Android 环境下忽略。
      }
    };

    void setupBackButton();

    return () => {
      removeListener?.();
    };
  }, [syncNavbarTab]);

  // 根据登录状态决定跳转目标：已登录→主页，未登录→登录页
  const getPostAuthScreen = (): ScreenId => (isLoggedIn ? 'home' : 'login');

  // 从引导页导航：完成引导后跳转主页或登录页
  const handleNavigateFromOnboarding = (screen: ScreenId) => {
    if (screen === 'home') {
      setHasCompletedOnboarding(true);
      navigateToScreen(getPostAuthScreen(), { replace: true, resetHistory: true });
      return;
    }
    navigateToScreen(screen);
  };

  // 从启动页导航：根据引导状态决定去向
  const handleNavigateFromSplash = (screen: ScreenId) => {
    if (screen === 'login' || screen === 'home') {
      navigateToScreen(hasCompletedOnboarding ? getPostAuthScreen() : 'onboarding', {
        replace: true,
        resetHistory: true,
      });
      return;
    }

    if (screen === 'onboarding') {
      navigateToScreen('onboarding', { replace: true, resetHistory: true });
      return;
    }

    navigateToScreen(screen);
  };

  // 从登录页导航：登录成功后标记为已登录
  const handleNavigateFromLogin = (screen: ScreenId) => {
    if (screen === 'profile' || screen === 'home') {
      setHasCompletedOnboarding(true);
      setIsLoggedIn(true);
      navigateToScreen(screen, { replace: true, resetHistory: true });
      return;
    }

    if (screen === 'login') {
      setIsLoggedIn(false);
    }

    navigateToScreen(screen);
  };

  // 从个人中心/设置页导航：处理退出登录等操作
  const handleNavigateFromProfileOrSettings = (screen: ScreenId) => {
    if (screen === 'login') {
      setIsLoggedIn(false);
      setActiveNavbarTabState('home');
      navigateToScreen('login', { replace: true, resetHistory: true });
      return;
    } else if (screen === 'profile') {
      setActiveNavbarTabState('profile');
    } else if (screen === 'my_traces') {
      setActiveNavbarTabState('traces');
    }

    navigateToScreen(screen);
  };

  const handleGenerateTemplateRoute = useCallback(async (shapeId: string, targetKm?: number) => {
    setSelectedShapeId(shapeId);
    setIsRouteGenerating(true);
    setRouteGenerationError(null);
    navigateToScreen('loading');
    try {
      const route = await createTemplateRoute(shapeId, targetKm);
      setGeneratedRoute(route);
      navigateToScreen('route_preview', { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'route_generation_failed';
      setRouteGenerationError(message);
      miniToast('路线生成失败，请稍后重试');
      navigateToScreen('home', { replace: true });
    } finally {
      setIsRouteGenerating(false);
    }
  }, [navigateToScreen]);

  const handleUploadImageRoute = useCallback(async (file: File) => {
    setIsRouteGenerating(true);
    setRouteGenerationError(null);
    navigateToScreen('loading');
    try {
      const route = await createImageRoute(file);
      setSelectedShapeId(route.shapeType || 'custom');
      setGeneratedRoute(route);
      navigateToScreen('route_preview', { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'image_route_generation_failed';
      setRouteGenerationError(message);
      miniToast('图片路线生成失败，请换一张图试试');
      navigateToScreen('home', { replace: true });
    } finally {
      setIsRouteGenerating(false);
    }
  }, [navigateToScreen]);

  const handleStartGeneratedRoute = useCallback(async (riskConfirmed: boolean) => {
    if (!generatedRoute) {
      miniToast('请先生成路线');
      return;
    }
    try {
      await startRoute(generatedRoute.id, riskConfirmed);
      navigateToScreen('nav');
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('high')) {
        miniToast('高风险路线不能直接开始，请调整后再试');
      } else if (message.includes('confirmation')) {
        miniToast('请先确认路线风险');
      } else {
        miniToast('开始导航失败，请稍后重试');
      }
    }
  }, [generatedRoute, navigateToScreen]);

  return (
    <I18nProvider>
      <div
        id="main_wrapper"
        className="min-h-[100dvh] bg-[#0F172A] text-slate-100 font-sans antialiased"
      >
        <AppViewport
          activeScreen={activeScreen}
          selectedShapeId={selectedShapeId}
          isBottomSheetOpen={isBottomSheetOpen}
          activeNavbarTab={activeNavbarTab}
          onSelectShape={setSelectedShapeId}
          openBottomSheet={() => {
            navigateToScreen('home', { replace: true });
            setIsBottomSheetOpen(true);
          }}
          setActiveScreen={navigateToScreen}
          setActiveNavbarTab={setActiveNavbarTabState}
          setIsBottomSheetOpen={setIsBottomSheetOpen}
          onNavigateFromOnboarding={handleNavigateFromOnboarding}
          onNavigateFromSplash={handleNavigateFromSplash}
          onNavigateFromLogin={handleNavigateFromLogin}
          onNavigateFromProfileOrSettings={handleNavigateFromProfileOrSettings}
          generatedRoute={generatedRoute}
          isRouteGenerating={isRouteGenerating}
          routeGenerationError={routeGenerationError}
          onGenerateTemplateRoute={handleGenerateTemplateRoute}
          onUploadImageRoute={handleUploadImageRoute}
          onStartGeneratedRoute={handleStartGeneratedRoute}
        />
      </div>
    </I18nProvider>
  );
}
