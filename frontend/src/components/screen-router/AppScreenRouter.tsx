/**
 * 应用屏幕路由器
 *
 * 根据 activeScreen 决定渲染哪个屏幕组件：
 * - 核心屏幕（首页、引导、登录）使用即时加载
 * - 其他屏幕使用 React.lazy 懒加载，按功能域分组
 *   - NavigationAndEditor：导航、参数调节、轨迹编辑
 *   - CommonModals：成功、加载中弹窗
 *   - HomeAndLibrary：快速模板、图形库
 *   - ProfileAndSettings：个人中心、设置
 *   - TraceJourneyScreens：启动页、我的轨迹、轨迹详情、跑步记录
 *   - DiscoveryScreens：收藏、模板详情、搜索
 *   - CommunityScreens：分享、广场、消息
 */
import React, { Suspense, useCallback, lazy } from 'react';
import { ScreenId } from '../../types';
import { ErrorBoundary } from '../ErrorBoundary';

// 核心屏幕即时加载（首页、引导、登录）
import { HomeScreen } from '../HomeAndLibrary';
import { OnboardingScreen, LoginScreen } from '../AuthScreens';

// 二级屏幕按功能域懒加载，减少首屏体积
// 懒加载路由组件：导航/参数调节/编辑器
const NavigationAndEditor = lazy(() =>
  import('../NavigationAndEditor').then((m) => ({
    default: ({ screen, props }: { screen: string; props: Record<string, unknown> }) => {
      if (screen === 'nav') return <m.MapNavigationScreen {...(props as React.ComponentProps<typeof m.MapNavigationScreen>)} />;
      if (screen === 'param_adjust') return <m.ParamAdjustScreen {...(props as React.ComponentProps<typeof m.ParamAdjustScreen>)} />;
      if (screen === 'editor') return <m.TraceEditorScreen {...(props as React.ComponentProps<typeof m.TraceEditorScreen>)} />;
      return null;
    },
  })),
);

// 懒加载路由组件：成功/加载中弹窗
const LazyModals = lazy(() =>
  import('../CommonModals').then((m) => ({
    default: ({ screen, props }: { screen: string; props: Record<string, unknown> }) => {
      if (screen === 'success') return <m.SuccessScreen {...(props as React.ComponentProps<typeof m.SuccessScreen>)} />;
      if (screen === 'loading') return <m.LoadingScreen {...(props as React.ComponentProps<typeof m.LoadingScreen>)} />;
      return null;
    },
  })),
);

// 懒加载路由组件：快速模板/图形库
const LazyHomeExtra = lazy(() =>
  import('../HomeExtraScreens').then((m) => ({
    default: ({ screen, props }: { screen: string; props: Record<string, unknown> }) => {
      if (screen === 'quick_cards') return <m.QuickTemplateScreen {...(props as React.ComponentProps<typeof m.QuickTemplateScreen>)} />;
      if (screen === 'library') return <m.FullLibraryScreen {...(props as React.ComponentProps<typeof m.FullLibraryScreen>)} />;
      return null;
    },
  })),
);

// 懒加载路由组件：个人中心/设置
const LazyProfileAndSettings = lazy(() =>
  import('../ProfileAndSettings').then((m) => ({
    default: ({ screen, props }: { screen: string; props: Record<string, unknown> }) => {
      if (screen === 'profile') return <m.ProfileScreen {...(props as React.ComponentProps<typeof m.ProfileScreen>)} />;
      if (screen === 'settings') return <m.SettingsScreen {...(props as React.ComponentProps<typeof m.SettingsScreen>)} />;
      return null;
    },
  })),
);

// 懒加载路由组件：轨迹旅程（启动页/我的轨迹/详情/历史）
const LazyTraceJourney = lazy(() =>
  import('../TraceJourneyScreens').then((m) => ({
    default: ({ screen, props }: { screen: string; props: Record<string, unknown> }) => {
      if (screen === 'splash') return <m.SplashScreen {...(props as React.ComponentProps<typeof m.SplashScreen>)} />;
      if (screen === 'my_traces') return <m.MyTracesScreen {...(props as React.ComponentProps<typeof m.MyTracesScreen>)} />;
      if (screen === 'trace_detail') return <m.TraceDetailScreen {...(props as React.ComponentProps<typeof m.TraceDetailScreen>)} />;
      if (screen === 'run_history') return <m.RunHistoryScreen {...(props as React.ComponentProps<typeof m.RunHistoryScreen>)} />;
      if (screen === 'run_detail') return <m.RunDetailScreen {...(props as React.ComponentProps<typeof m.RunDetailScreen>)} />;
      return null;
    },
  })),
);

// 懒加载路由组件：发现页（收藏/模板详情/搜索）
const LazyDiscovery = lazy(() =>
  import('../DiscoveryScreens').then((m) => ({
    default: ({ screen, props }: { screen: string; props: Record<string, unknown> }) => {
      if (screen === 'favorites') return <m.FavoritesScreen {...(props as React.ComponentProps<typeof m.FavoritesScreen>)} />;
      if (screen === 'template_detail') return <m.TemplateDetailScreen {...(props as React.ComponentProps<typeof m.TemplateDetailScreen>)} />;
      if (screen === 'search') return <m.SearchScreen {...(props as React.ComponentProps<typeof m.SearchScreen>)} />;
      if (screen === 'search_result') return <m.SearchResultScreen {...(props as React.ComponentProps<typeof m.SearchResultScreen>)} />;
      return null;
    },
  })),
);

// 懒加载路由组件：社区页（分享/广场/消息）
const LazyCommunity = lazy(() =>
  import('../CommunityScreens').then((m) => ({
    default: ({ screen, props }: { screen: string; props: Record<string, unknown> }) => {
      if (screen === 'trace_share') return <m.TraceShareScreen {...(props as React.ComponentProps<typeof m.TraceShareScreen>)} />;
      if (screen === 'square') return <m.SquareScreen {...(props as React.ComponentProps<typeof m.SquareScreen>)} />;
      if (screen === 'post_detail') return <m.PostDetailScreen {...(props as React.ComponentProps<typeof m.PostDetailScreen>)} />;
      if (screen === 'notifications') return <m.NotificationsScreen {...(props as React.ComponentProps<typeof m.NotificationsScreen>)} />;
      return null;
    },
  })),
);

interface AppScreenRouterProps {
  activeScreen: ScreenId;
  selectedShapeId: string;
  activeNavbarTab: 'home' | 'traces' | 'profile';
  setActiveScreen: (screen: ScreenId) => void;
  setActiveNavbarTab: (tab: 'home' | 'traces' | 'profile') => void;
  onNavigateFromOnboarding: (screen: ScreenId) => void;
  onNavigateFromSplash: (screen: ScreenId) => void;
  onNavigateFromLogin: (screen: ScreenId) => void;
  onNavigateFromProfileOrSettings: (screen: ScreenId) => void;
  onSelectShape: (shapeId: string) => void;
  openBottomSheet: () => void;
  onSuccessNavigate?: () => void;
}

// 懒加载组件加载中的旋转动画回退
const LoadingFallback = () => (
  <div className="flex-1 flex items-center justify-center bg-white">
    <div className="w-8 h-8 border-3 border-tc-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

export const AppScreenRouter: React.FC<AppScreenRouterProps> = ({
  activeScreen,
  selectedShapeId,
  activeNavbarTab,
  setActiveScreen,
  setActiveNavbarTab,
  onNavigateFromOnboarding,
  onNavigateFromSplash,
  onNavigateFromLogin,
  onNavigateFromProfileOrSettings,
  onSelectShape,
  openBottomSheet,
  onSuccessNavigate,
}) => {
  // 提取具名导航回调，减少匿名函数创建
  const navigate = useCallback(
    (screen: ScreenId) => setActiveScreen(screen),
    [setActiveScreen],
  );

  // 导航并触发成功回调（关闭底部弹窗）
  const navigateWithSuccess = useCallback(
    (screen: ScreenId) => {
      setActiveScreen(screen);
      onSuccessNavigate?.();
    },
    [setActiveScreen, onSuccessNavigate],
  );

  return (
    <ErrorBoundary>
      <div className="flex-1 overflow-hidden relative">
        {/* ===== 核心屏幕（即时加载） ===== */}
        {activeScreen === 'home' && (
          <HomeScreen
            onNavigate={navigate}
            onSelectShape={onSelectShape}
            openBottomSheet={openBottomSheet}
            activeNavbarTab={activeNavbarTab}
            setActiveNavbarTab={setActiveNavbarTab}
          />
        )}

        {activeScreen === 'onboarding' && (
          <OnboardingScreen onNavigate={onNavigateFromOnboarding} />
        )}

        {activeScreen === 'login' && (
          <LoginScreen onNavigate={onNavigateFromLogin} />
        )}

        {/* ===== 懒加载屏幕组 ===== */}
        <Suspense fallback={<LoadingFallback />}>
          {(activeScreen === 'nav' || activeScreen === 'param_adjust' || activeScreen === 'editor') && (
            <NavigationAndEditor
              screen={activeScreen}
              props={{
                onNavigate: navigate,
                selectedShapeId,
              }}
            />
          )}

          {(activeScreen === 'success' || activeScreen === 'loading') && (
            <LazyModals
              screen={activeScreen}
              props={{
                onNavigate: activeScreen === 'success' ? navigateWithSuccess : navigate,
                selectedShapeId,
              }}
            />
          )}

          {(activeScreen === 'quick_cards' || activeScreen === 'library') && (
            <LazyHomeExtra
              screen={activeScreen}
              props={{ onNavigate: navigate, onSelectShape }}
            />
          )}

          {(activeScreen === 'profile' || activeScreen === 'settings') && (
            <LazyProfileAndSettings
              screen={activeScreen}
              props={{
                onNavigate: onNavigateFromProfileOrSettings,
                activeNavbarTab,
                setActiveNavbarTab,
              }}
            />
          )}

          {(activeScreen === 'splash' || activeScreen === 'my_traces' || activeScreen === 'trace_detail' || activeScreen === 'run_history' || activeScreen === 'run_detail') && (
            <LazyTraceJourney
              screen={activeScreen}
              props={{
                onNavigate: activeScreen === 'splash' ? onNavigateFromSplash : navigate,
                activeNavbarTab,
                setActiveNavbarTab,
                selectedShapeId,
              }}
            />
          )}

          {(activeScreen === 'favorites' || activeScreen === 'template_detail' || activeScreen === 'search' || activeScreen === 'search_result') && (
            <LazyDiscovery
              screen={activeScreen}
              props={{
                onNavigate: navigate,
                activeNavbarTab,
                setActiveNavbarTab,
              }}
            />
          )}

          {(activeScreen === 'trace_share' || activeScreen === 'square' || activeScreen === 'post_detail' || activeScreen === 'notifications') && (
            <LazyCommunity
              screen={activeScreen}
              props={{ onNavigate: navigate }}
            />
          )}
        </Suspense>
      </div>
    </ErrorBoundary>
  );
};
