/**
 * TraceCraft 应用根组件
 *
 * 核心职责：
 *   1. 管理全局状态：当前屏幕、选中图形、底部弹窗、导航栏标签页
 *   2. 管理用户引导流程：首次引导（onboarding）→ 登录 → 主页
 *   3. 持久化 onboarding/login 状态到 localStorage，重启后恢复
 *   4. 包装 I18nProvider 提供国际化支持
 */
import { useState, useEffect, useCallback } from 'react';

import { GeneratedRoute, ScreenId } from './types';
import { AppViewport } from './components/AppViewport';
import { I18nProvider } from './i18n';
import { ToastProvider } from './components/common/Toast';
import { AppProvider } from './context/AppContext';
import { createImageRoute, createTemplateRoute, startRoute } from './api/routes';
import { getTemplate } from './api/discovery';
import { clearAuthSession, hasAuthSession } from './api/auth';
import { miniToast } from './utils';
import { connectRealtime, disconnectRealtime, onRealtime } from './services/realtime';
import { initPushNotifications, resetPushNotifications } from './services/pushNotifications';
import { useScreenNavigation } from './hooks/useScreenNavigation';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { ErrorBoundary } from './components/ErrorBoundary';

// localStorage 持久化键名（移至组件外部，避免每次渲染重新创建）
const STORAGE_KEYS = {
  onboardingDone: 'tracecraft_onboarding_done',
  isLoggedIn: 'tracecraft_is_logged_in',
} as const;

export default function App() {

  // 当前选中的图形模板 ID
  const [selectedShapeId, setSelectedShapeId] = useState<string>('star');
  // 底部弹窗是否打开
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState<boolean>(false);
  // 会话是否就绪（初始化完成后置 true）
  const [isSessionReady, setIsSessionReady] = useState<boolean>(false);
  // 是否已完成首次引导
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean>(false);
  // 是否已登录
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [generatedRoute, setGeneratedRoute] = useState<GeneratedRoute | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isRouteGenerating, setIsRouteGenerating] = useState<boolean>(false);
  const [routeGenerationError, setRouteGenerationError] = useState<string | null>(null);
  const closeBottomSheet = useCallback(() => setIsBottomSheetOpen(false), []);
  const {
    activeScreen,
    activeNavbarTab,
    setActiveNavbarTab,
    navigateToScreen,
  } = useScreenNavigation({
    initialScreen: 'splash',
    isBottomSheetOpen,
    closeBottomSheet,
  });

  // 从 localStorage 恢复引导和登录状态
  useEffect(() => {
    try {
      const onboardingDone = localStorage.getItem(STORAGE_KEYS.onboardingDone) === '1';
      const loggedIn = localStorage.getItem(STORAGE_KEYS.isLoggedIn) === '1' && hasAuthSession();
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
    if (!isSessionReady || !isLoggedIn) {
      disconnectRealtime();
      resetPushNotifications();
      return;
    }

    connectRealtime();
    void initPushNotifications();
    const offNotification = onRealtime('notification', (notification) => {
      miniToast(notification.title || '收到新消息');
    });
    return () => {
      offNotification();
      disconnectRealtime();
      resetPushNotifications();
    };
  }, [isSessionReady, isLoggedIn]);

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
      clearAuthSession();
      navigateToScreen('login', { replace: true, resetHistory: true });
      return;
    }

    navigateToScreen(screen);
  };

  function routeErrorMessage(error: unknown, fallback: string): string {
    const message = error instanceof Error ? error.message : fallback;
    if (message === 'location_required') return '需要开启定位或授权当前位置后再生成路线';
    if (message === 'invalid_target_distance') return '目标里程需在 1-50 公里之间';
    if (message === 'start_point_required') return '缺少起点位置，请授权定位后重试';
    return message;
  }

  const handleGenerateTemplateRoute = useCallback(async (shapeId: string, targetKm?: number) => {
    setSelectedShapeId(shapeId);
    setActiveSessionId(null);
    setIsRouteGenerating(true);
    setRouteGenerationError(null);
    navigateToScreen('loading');
    try {
      let template: { id?: string; templateCode?: string; shapeType?: string } | null = null;
      if (activeScreen === 'param_adjust') {
        try {
          const templateId = localStorage.getItem('tracecraft_selected_template_id');
          template = templateId ? await getTemplate(templateId) : null;
        } catch {
          template = null;
        }
      }
      const effectiveShapeId = template?.shapeType || shapeId;
      const route = await createTemplateRoute(effectiveShapeId, targetKm, template || undefined);
      setSelectedShapeId(effectiveShapeId);
      setGeneratedRoute(route);
      navigateToScreen('route_preview', { replace: true });
    } catch (error) {
      const message = routeErrorMessage(error, 'route_generation_failed');
      setRouteGenerationError(message);
      miniToast(message);
      navigateToScreen('home', { replace: true });
    } finally {
      setIsRouteGenerating(false);
    }
  }, [activeScreen, navigateToScreen]);

  const handleUploadImageRoute = useCallback(async (file: File) => {
    setIsRouteGenerating(true);
    setActiveSessionId(null);
    setRouteGenerationError(null);
    navigateToScreen('loading');
    try {
      const route = await createImageRoute(file);
      setSelectedShapeId(route.shapeType || 'custom');
      setGeneratedRoute(route);
      navigateToScreen('route_preview', { replace: true });
    } catch (error) {
      const message = routeErrorMessage(error, 'image_route_generation_failed');
      setRouteGenerationError(message);
      miniToast(message);
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
      const sessionId = await startRoute(generatedRoute.id, riskConfirmed);
      setActiveSessionId(sessionId);
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
      <ErrorBoundary>
      <ToastProvider>
        <AppProvider navigateToScreen={navigateToScreen} setActiveNavbarTab={setActiveNavbarTab}>
        <OfflineIndicator />
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
          setActiveNavbarTab={setActiveNavbarTab}
          setIsBottomSheetOpen={setIsBottomSheetOpen}
          onNavigateFromOnboarding={handleNavigateFromOnboarding}
          onNavigateFromSplash={handleNavigateFromSplash}
          onNavigateFromLogin={handleNavigateFromLogin}
          onNavigateFromProfileOrSettings={handleNavigateFromProfileOrSettings}
          generatedRoute={generatedRoute}
          activeSessionId={activeSessionId}
          isRouteGenerating={isRouteGenerating}
          routeGenerationError={routeGenerationError}
          onGenerateTemplateRoute={handleGenerateTemplateRoute}
          onUploadImageRoute={handleUploadImageRoute}
          onStartGeneratedRoute={handleStartGeneratedRoute}
        />
      </div>
      </AppProvider>
      </ToastProvider>
      </ErrorBoundary>
    </I18nProvider>
  );
}
