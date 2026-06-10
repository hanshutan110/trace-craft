import React, { Suspense, useCallback, lazy } from 'react';
import { ScreenId } from '../../types';
import { ErrorBoundary } from '../ErrorBoundary';

// Eager imports for core screens (always needed)
import { HomeScreen } from '../HomeAndLibrary';
import { OnboardingScreen, LoginScreen } from '../AuthScreens';

// Lazy imports for secondary screen groups
const NavigationAndEditor = lazy(() =>
  import('../NavigationAndEditor').then((m) => ({
    default: ({ screen, props }: { screen: string; props: Record<string, unknown> }) => {
      if (screen === 'nav') return <m.MapNavigationScreen {...(props as any)} />;
      if (screen === 'param_adjust') return <m.ParamAdjustScreen {...(props as any)} />;
      if (screen === 'editor') return <m.TraceEditorScreen {...(props as any)} />;
      return null;
    },
  })),
);

const LazyModals = lazy(() =>
  import('../CommonModals').then((m) => ({
    default: ({ screen, props }: { screen: string; props: Record<string, unknown> }) => {
      if (screen === 'success') return <m.SuccessScreen {...(props as any)} />;
      if (screen === 'loading') return <m.LoadingScreen {...(props as any)} />;
      return null;
    },
  })),
);

const LazyHomeExtra = lazy(() =>
  import('../HomeAndLibrary').then((m) => ({
    default: ({ screen, props }: { screen: string; props: Record<string, unknown> }) => {
      if (screen === 'quick_cards') return <m.QuickTemplateScreen {...(props as any)} />;
      if (screen === 'library') return <m.FullLibraryScreen {...(props as any)} />;
      return null;
    },
  })),
);

const LazyProfileAndSettings = lazy(() =>
  import('../ProfileAndSettings').then((m) => ({
    default: ({ screen, props }: { screen: string; props: Record<string, unknown> }) => {
      if (screen === 'profile') return <m.ProfileScreen {...(props as any)} />;
      if (screen === 'settings') return <m.SettingsScreen {...(props as any)} />;
      return null;
    },
  })),
);

const LazyTraceJourney = lazy(() =>
  import('../TraceJourneyScreens').then((m) => ({
    default: ({ screen, props }: { screen: string; props: Record<string, unknown> }) => {
      if (screen === 'splash') return <m.SplashScreen {...(props as any)} />;
      if (screen === 'my_traces') return <m.MyTracesScreen {...(props as any)} />;
      if (screen === 'trace_detail') return <m.TraceDetailScreen {...(props as any)} />;
      if (screen === 'run_history') return <m.RunHistoryScreen {...(props as any)} />;
      if (screen === 'run_detail') return <m.RunDetailScreen {...(props as any)} />;
      return null;
    },
  })),
);

const LazyDiscovery = lazy(() =>
  import('../DiscoveryScreens').then((m) => ({
    default: ({ screen, props }: { screen: string; props: Record<string, unknown> }) => {
      if (screen === 'favorites') return <m.FavoritesScreen {...(props as any)} />;
      if (screen === 'template_detail') return <m.TemplateDetailScreen {...(props as any)} />;
      if (screen === 'search') return <m.SearchScreen {...(props as any)} />;
      if (screen === 'search_result') return <m.SearchResultScreen {...(props as any)} />;
      return null;
    },
  })),
);

const LazyCommunity = lazy(() =>
  import('../CommunityScreens').then((m) => ({
    default: ({ screen, props }: { screen: string; props: Record<string, unknown> }) => {
      if (screen === 'trace_share') return <m.TraceShareScreen {...(props as any)} />;
      if (screen === 'square') return <m.SquareScreen {...(props as any)} />;
      if (screen === 'post_detail') return <m.PostDetailScreen {...(props as any)} />;
      if (screen === 'notifications') return <m.NotificationsScreen {...(props as any)} />;
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
  // Extracted named navigation callbacks to reduce anonymous function creation
  const navigate = useCallback(
    (screen: ScreenId) => setActiveScreen(screen),
    [setActiveScreen],
  );

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
        {/* ===== Eager core screens ===== */}
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

        {/* ===== Lazy-loaded screen groups ===== */}
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
