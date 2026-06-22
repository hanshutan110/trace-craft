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
import { GeneratedRoute, ScreenId } from '../../types';
import { ErrorBoundary } from '../ErrorBoundary';

// 核心屏幕即时加载（首页、引导、登录）
import { HomeScreen } from '../HomeAndLibrary';
// 引导页和登录页已拆分至 screens/ 目录下的独立文件
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { LoginScreen } from '../screens/LoginScreen';

// 二级屏幕按功能域懒加载，减少首屏体积
// 懒加载路由组件：导航/参数调节/编辑器（已拆分至 screens/ 目录独立文件）
const NavigationAndEditor = lazy(() =>
  Promise.all([
    import('../screens/MapNavigationScreen'),
    import('../screens/ParamAdjustScreen'),
    import('../screens/RoutePreviewScreen'),
    import('../screens/TraceEditorScreen'),
  ]).then(([nav, param, preview, editor]) => ({
    default: ({ screen, props }: { screen: string; props: Record<string, unknown> }) => {
      if (screen === 'nav') return <nav.MapNavigationScreen {...(props as unknown as React.ComponentProps<typeof nav.MapNavigationScreen>)} />;
      if (screen === 'param_adjust') return <param.ParamAdjustScreen {...(props as unknown as React.ComponentProps<typeof param.ParamAdjustScreen>)} />;
      if (screen === 'route_preview') return <preview.RoutePreviewScreen {...(props as unknown as React.ComponentProps<typeof preview.RoutePreviewScreen>)} />;
      if (screen === 'editor') return <editor.TraceEditorScreen {...(props as unknown as React.ComponentProps<typeof editor.TraceEditorScreen>)} />;
      return null;
    },
  })),
);

// 懒加载路由组件：成功/加载中弹窗
const LazyModals = lazy(() =>
  import('../CommonModals').then((m) => ({
    default: ({ screen, props }: { screen: string; props: Record<string, unknown> }) => {
      if (screen === 'success') return <m.SuccessScreen {...(props as unknown as React.ComponentProps<typeof m.SuccessScreen>)} />;
      if (screen === 'loading') return <m.LoadingScreen {...(props as unknown as React.ComponentProps<typeof m.LoadingScreen>)} />;
      return null;
    },
  })),
);

// 懒加载路由组件：快速模板/图形库
const LazyHomeExtra = lazy(() =>
  import('../HomeExtraScreens').then((m) => ({
    default: ({ screen, props }: { screen: string; props: Record<string, unknown> }) => {
      if (screen === 'quick_cards') return <m.QuickTemplateScreen {...(props as unknown as React.ComponentProps<typeof m.QuickTemplateScreen>)} />;
      if (screen === 'library') return <m.FullLibraryScreen {...(props as unknown as React.ComponentProps<typeof m.FullLibraryScreen>)} />;
      return null;
    },
  })),
);

// 懒加载路由组件：个人中心/设置（已拆分至 screens/ 目录独立文件）
const LazyProfileAndSettings = lazy(() =>
  Promise.all([
    import('../screens/ProfileScreen'),
    import('../screens/SettingsScreen'),
    import('../screens/LegalDocumentScreen'),
  ]).then(([profile, settings, legal]) => ({
    default: ({ screen, props }: { screen: string; props: Record<string, unknown> }) => {
      if (screen === 'profile') return <profile.ProfileScreen {...(props as unknown as React.ComponentProps<typeof profile.ProfileScreen>)} />;
      if (screen === 'settings') return <settings.SettingsScreen {...(props as unknown as React.ComponentProps<typeof settings.SettingsScreen>)} />;
      if (screen === 'privacy_policy' || screen === 'user_agreement' || screen === 'permission_notice') return <legal.LegalDocumentScreen screen={screen as ScreenId} {...(props as unknown as Omit<React.ComponentProps<typeof legal.LegalDocumentScreen>, 'screen'>)} />;
      return null;
    },
  })),
);

// 懒加载路由组件：轨迹旅程（已拆分至 screens/ 目录独立文件）
const LazyTraceJourney = lazy(() =>
  Promise.all([
    import('../screens/SplashScreen'),
    import('../screens/MyTracesScreen'),
    import('../screens/TraceDetailScreen'),
    import('../screens/RunHistoryScreen'),
    import('../screens/RunDetailScreen'),
  ]).then(([splash, traces, detail, history, runDetail]) => ({
    default: ({ screen, props }: { screen: string; props: Record<string, unknown> }) => {
      if (screen === 'splash') return <splash.SplashScreen {...(props as unknown as React.ComponentProps<typeof splash.SplashScreen>)} />;
      if (screen === 'my_traces') return <traces.MyTracesScreen {...(props as unknown as React.ComponentProps<typeof traces.MyTracesScreen>)} />;
      if (screen === 'trace_detail') return <detail.TraceDetailScreen {...(props as unknown as React.ComponentProps<typeof detail.TraceDetailScreen>)} />;
      if (screen === 'run_history') return <history.RunHistoryScreen {...(props as unknown as React.ComponentProps<typeof history.RunHistoryScreen>)} />;
      if (screen === 'run_detail') return <runDetail.RunDetailScreen {...(props as unknown as React.ComponentProps<typeof runDetail.RunDetailScreen>)} />;
      return null;
    },
  })),
);

// 懒加载路由组件：发现页（已拆分至 screens/ 目录独立文件）
const LazyDiscovery = lazy(() =>
  Promise.all([
    import('../screens/FavoritesScreen'),
    import('../screens/TemplateDetailScreen'),
    import('../screens/SearchScreen'),
    import('../screens/SearchResultScreen'),
  ]).then(([fav, tpl, search, result]) => ({
    default: ({ screen, props }: { screen: string; props: Record<string, unknown> }) => {
      if (screen === 'favorites') return <fav.FavoritesScreen {...(props as unknown as React.ComponentProps<typeof fav.FavoritesScreen>)} />;
      if (screen === 'template_detail') return <tpl.TemplateDetailScreen {...(props as unknown as React.ComponentProps<typeof tpl.TemplateDetailScreen>)} />;
      if (screen === 'search') return <search.SearchScreen {...(props as unknown as React.ComponentProps<typeof search.SearchScreen>)} />;
      if (screen === 'search_result') return <result.SearchResultScreen {...(props as unknown as React.ComponentProps<typeof result.SearchResultScreen>)} />;
      return null;
    },
  })),
);

// 懒加载路由组件：社区页（已拆分至 screens/ 目录独立文件）
const LazyCommunity = lazy(() =>
  Promise.all([
    import('../screens/TraceShareScreen'),
    import('../screens/SquareScreen'),
    import('../screens/PostDetailScreen'),
    import('../screens/NotificationsScreen'),
  ]).then(([share, square, post, notif]) => ({
    default: ({ screen, props }: { screen: string; props: Record<string, unknown> }) => {
      if (screen === 'trace_share') return <share.TraceShareScreen {...(props as unknown as React.ComponentProps<typeof share.TraceShareScreen>)} />;
      if (screen === 'square') return <square.SquareScreen {...(props as unknown as React.ComponentProps<typeof square.SquareScreen>)} />;
      if (screen === 'post_detail') return <post.PostDetailScreen {...(props as unknown as React.ComponentProps<typeof post.PostDetailScreen>)} />;
      if (screen === 'notifications') return <notif.NotificationsScreen {...(props as unknown as React.ComponentProps<typeof notif.NotificationsScreen>)} />;
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
  generatedRoute: GeneratedRoute | null;
  activeSessionId: string | null;
  isRouteGenerating: boolean;
  routeGenerationError: string | null;
  onGenerateTemplateRoute: (shapeId: string, targetKm?: number) => Promise<void>;
  onUploadImageRoute: (file: File) => Promise<void>;
  onStartGeneratedRoute: (riskConfirmed: boolean) => Promise<void>;
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
  generatedRoute,
  activeSessionId,
  isRouteGenerating,
  routeGenerationError,
  onGenerateTemplateRoute,
  onUploadImageRoute,
  onStartGeneratedRoute,
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
            onGenerateTemplateRoute={onGenerateTemplateRoute}
            onUploadImageRoute={onUploadImageRoute}
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
          {(activeScreen === 'nav' || activeScreen === 'param_adjust' || activeScreen === 'route_preview' || activeScreen === 'editor') && (
            <NavigationAndEditor
              screen={activeScreen}
              props={{
                onNavigate: navigate,
                selectedShapeId,
                generatedRoute,
                activeSessionId,
                isRouteGenerating,
                routeGenerationError,
                onGenerateTemplateRoute,
                onStartGeneratedRoute,
              }}
            />
          )}

          {(activeScreen === 'success' || activeScreen === 'loading') && (
            <LazyModals
              screen={activeScreen}
              props={{
                onNavigate: activeScreen === 'success' ? navigateWithSuccess : navigate,
                selectedShapeId,
                isRouteGenerating,
                generatedRoute,
                activeSessionId,
              }}
            />
          )}

          {(activeScreen === 'quick_cards' || activeScreen === 'library') && (
            <LazyHomeExtra
              screen={activeScreen}
              props={{ onNavigate: navigate, onSelectShape, onGenerateTemplateRoute, onUploadImageRoute }}
            />
          )}

          {(activeScreen === 'profile' || activeScreen === 'settings' || activeScreen === 'privacy_policy' || activeScreen === 'user_agreement' || activeScreen === 'permission_notice') && (
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
