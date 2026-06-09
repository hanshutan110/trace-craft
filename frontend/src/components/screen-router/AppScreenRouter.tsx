import React from 'react';
import { ScreenId } from '../../types';

import {
  HomeScreen,
  QuickTemplateScreen,
  FullLibraryScreen,
} from '../HomeAndLibrary';

import {
  MapNavigationScreen,
  ParamAdjustScreen,
  TraceEditorScreen,
} from '../NavigationAndEditor';

import {
  OnboardingScreen,
  SuccessScreen,
  LoadingScreen,
  LoginScreen,
  ProfileScreen,
  SettingsScreen,
} from '../Others';

import {
  SplashScreen,
  MyTracesScreen,
  TraceDetailScreen,
  RunHistoryScreen,
  RunDetailScreen,
} from '../TraceJourneyScreens';

import {
  FavoritesScreen,
  TemplateDetailScreen,
  SearchScreen,
  SearchResultScreen,
} from '../DiscoveryScreens';

import {
  TraceShareScreen,
  SquareScreen,
  PostDetailScreen,
  NotificationsScreen,
} from '../CommunityScreens';

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
  return (
    <div className="flex-1 overflow-hidden relative">
      {activeScreen === 'home' && (
        <HomeScreen
          onNavigate={(screen) => setActiveScreen(screen)}
          onSelectShape={onSelectShape}
          openBottomSheet={openBottomSheet}
          activeNavbarTab={activeNavbarTab}
          setActiveNavbarTab={setActiveNavbarTab}
        />
      )}

      {activeScreen === 'onboarding' && (
        <OnboardingScreen onNavigate={onNavigateFromOnboarding} />
      )}

      {activeScreen === 'nav' && (
        <MapNavigationScreen
          onNavigate={(screen) => setActiveScreen(screen)}
          selectedShapeId={selectedShapeId}
        />
      )}

      {activeScreen === 'success' && (
        <SuccessScreen
          onNavigate={(screen) => {
            setActiveScreen(screen);
            onSuccessNavigate?.();
          }}
        />
      )}

      {activeScreen === 'editor' && (
        <TraceEditorScreen onNavigate={(screen) => setActiveScreen(screen)} />
      )}

      {activeScreen === 'param_adjust' && (
        <ParamAdjustScreen
          onNavigate={(screen) => setActiveScreen(screen)}
          selectedShapeId={selectedShapeId}
        />
      )}

      {activeScreen === 'quick_cards' && (
        <QuickTemplateScreen
          onNavigate={(screen) => setActiveScreen(screen)}
          onSelectShape={onSelectShape}
        />
      )}

      {activeScreen === 'loading' && (
        <LoadingScreen
          onNavigate={(screen) => setActiveScreen(screen)}
          selectedShapeId={selectedShapeId}
        />
      )}

      {activeScreen === 'library' && (
        <FullLibraryScreen
          onNavigate={(screen) => setActiveScreen(screen)}
          onSelectShape={onSelectShape}
        />
      )}

      {activeScreen === 'login' && (
        <LoginScreen onNavigate={onNavigateFromLogin} />
      )}

      {activeScreen === 'profile' && (
        <ProfileScreen
          onNavigate={onNavigateFromProfileOrSettings}
          activeNavbarTab={activeNavbarTab}
          setActiveNavbarTab={setActiveNavbarTab}
        />
      )}

      {activeScreen === 'settings' && (
        <SettingsScreen onNavigate={onNavigateFromProfileOrSettings} />
      )}

      {activeScreen === 'splash' && (
        <SplashScreen onNavigate={onNavigateFromSplash} />
      )}

      {activeScreen === 'my_traces' && (
        <MyTracesScreen
          onNavigate={(screen) => setActiveScreen(screen)}
          activeNavbarTab={activeNavbarTab}
          setActiveNavbarTab={setActiveNavbarTab}
        />
      )}

      {activeScreen === 'trace_detail' && (
        <TraceDetailScreen onNavigate={(screen) => setActiveScreen(screen)} />
      )}

      {activeScreen === 'run_history' && (
        <RunHistoryScreen
          onNavigate={(screen) => setActiveScreen(screen)}
          activeNavbarTab={activeNavbarTab}
          setActiveNavbarTab={setActiveNavbarTab}
        />
      )}

      {activeScreen === 'run_detail' && (
        <RunDetailScreen onNavigate={(screen) => setActiveScreen(screen)} />
      )}

      {activeScreen === 'favorites' && (
        <FavoritesScreen
          onNavigate={(screen) => setActiveScreen(screen)}
          activeNavbarTab={activeNavbarTab}
          setActiveNavbarTab={setActiveNavbarTab}
        />
      )}

      {activeScreen === 'template_detail' && (
        <TemplateDetailScreen onNavigate={(screen) => setActiveScreen(screen)} />
      )}

      {activeScreen === 'search' && (
        <SearchScreen onNavigate={(screen) => setActiveScreen(screen)} />
      )}

      {activeScreen === 'search_result' && (
        <SearchResultScreen onNavigate={(screen) => setActiveScreen(screen)} />
      )}

      {activeScreen === 'trace_share' && (
        <TraceShareScreen onNavigate={(screen) => setActiveScreen(screen)} />
      )}

      {activeScreen === 'square' && (
        <SquareScreen onNavigate={(screen) => setActiveScreen(screen)} />
      )}

      {activeScreen === 'post_detail' && (
        <PostDetailScreen onNavigate={(screen) => setActiveScreen(screen)} />
      )}

      {activeScreen === 'notifications' && (
        <NotificationsScreen onNavigate={(screen) => setActiveScreen(screen)} />
      )}
    </div>
  );
};

