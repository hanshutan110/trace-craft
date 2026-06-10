/**
 * TraceCraft 应用根组件
 *
 * 核心职责：
 *   1. 管理全局状态：当前屏幕、选中图形、底部弹窗、导航栏标签页
 *   2. 管理用户引导流程：首次引导（onboarding）→ 登录 → 主页
 *   3. 持久化 onboarding/login 状态到 localStorage，重启后恢复
 *   4. 包装 I18nProvider 提供国际化支持
 */
import { useState, useEffect } from 'react';

import { ScreenId } from './types';
import { AppViewport } from './components/AppViewport';
import { I18nProvider } from './i18n';

export default function App() {
  // localStorage 持久化键名
  const STORAGE_KEYS = {
    onboardingDone: 'tracecraft_onboarding_done',
    isLoggedIn: 'tracecraft_is_logged_in',
  } as const;

  // 当前激活的屏幕 ID
  const [activeScreen, setActiveScreen] = useState<ScreenId>('splash');
  // 当前选中的图形模板 ID
  const [selectedShapeId, setSelectedShapeId] = useState<string>('star');
  // 底部弹窗是否打开
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState<boolean>(false);
  // 底部导航栏当前标签页
  const [activeNavbarTab, setActiveNavbarTab] = useState<'home' | 'traces' | 'profile'>('home');
  // 会话是否就绪（初始化完成后置 true）
  const [isSessionReady, setIsSessionReady] = useState<boolean>(false);
  // 是否已完成首次引导
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean>(false);
  // 是否已登录
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

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

  // 根据登录状态决定跳转目标：已登录→主页，未登录→登录页
  const getPostAuthScreen = (): ScreenId => (isLoggedIn ? 'home' : 'login');

  // 从引导页导航：完成引导后跳转主页或登录页
  const handleNavigateFromOnboarding = (screen: ScreenId) => {
    if (screen === 'home') {
      setActiveNavbarTab('home');
      setHasCompletedOnboarding(true);
      setActiveScreen(getPostAuthScreen());
      return;
    }
    setActiveScreen(screen);
  };

  // 从启动页导航：根据引导状态决定去向
  const handleNavigateFromSplash = (screen: ScreenId) => {
    if (screen === 'login' || screen === 'home') {
      setActiveScreen(hasCompletedOnboarding ? getPostAuthScreen() : 'onboarding');
      return;
    }

    if (screen === 'onboarding') {
      setActiveScreen('onboarding');
      return;
    }

    setActiveScreen(screen);
  };

  // 从登录页导航：登录成功后标记为已登录
  const handleNavigateFromLogin = (screen: ScreenId) => {
    if (screen === 'profile' || screen === 'home') {
      setActiveNavbarTab(screen === 'profile' ? 'profile' : 'home');
      setHasCompletedOnboarding(true);
      setIsLoggedIn(true);
      setActiveScreen(screen);
      return;
    }

    if (screen === 'login') {
      setIsLoggedIn(false);
    }

    setActiveScreen(screen);
  };

  // 从个人中心/设置页导航：处理退出登录等操作
  const handleNavigateFromProfileOrSettings = (screen: ScreenId) => {
    if (screen === 'login') {
      setIsLoggedIn(false);
      setActiveNavbarTab('home');
    } else if (screen === 'profile') {
      setActiveNavbarTab('profile');
    } else if (screen === 'my_traces') {
      setActiveNavbarTab('traces');
    }

    setActiveScreen(screen);
  };

  return (
    <I18nProvider>
      <div
        id="main_wrapper"
        className="min-h-screen bg-[#0F172A] text-slate-100 font-sans antialiased"
      >
        <AppViewport
          activeScreen={activeScreen}
          selectedShapeId={selectedShapeId}
          isBottomSheetOpen={isBottomSheetOpen}
          activeNavbarTab={activeNavbarTab}
          onSelectShape={setSelectedShapeId}
          openBottomSheet={() => {
            setActiveScreen('home');
            setIsBottomSheetOpen(true);
          }}
          setActiveScreen={setActiveScreen}
          setActiveNavbarTab={setActiveNavbarTab}
          setIsBottomSheetOpen={setIsBottomSheetOpen}
          onNavigateFromOnboarding={handleNavigateFromOnboarding}
          onNavigateFromSplash={handleNavigateFromSplash}
          onNavigateFromLogin={handleNavigateFromLogin}
          onNavigateFromProfileOrSettings={handleNavigateFromProfileOrSettings}
        />
      </div>
    </I18nProvider>
  );
}
