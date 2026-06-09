import { useState, useEffect } from 'react';

import { ScreenId } from './types';
import { AppViewport } from './components/AppViewport';
import { I18nProvider } from './i18n';

export default function App() {
  const STORAGE_KEYS = {
    onboardingDone: 'tracecraft_onboarding_done',
    isLoggedIn: 'tracecraft_is_logged_in',
  } as const;

  const [activeScreen, setActiveScreen] = useState<ScreenId>('splash');
  const [selectedShapeId, setSelectedShapeId] = useState<string>('star');
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState<boolean>(false);
  const [activeNavbarTab, setActiveNavbarTab] = useState<'home' | 'traces' | 'profile'>('home');
  const [isSessionReady, setIsSessionReady] = useState<boolean>(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean>(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  // Initialize persistent onboarding/login states.
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

  // Persist state updates for app restart/reopen.
  useEffect(() => {
    if (!isSessionReady) return;
    try {
      localStorage.setItem(STORAGE_KEYS.onboardingDone, hasCompletedOnboarding ? '1' : '0');
      localStorage.setItem(STORAGE_KEYS.isLoggedIn, isLoggedIn ? '1' : '0');
    } catch {
      // Ignore storage errors and keep UI state in memory.
    }
  }, [isSessionReady, hasCompletedOnboarding, isLoggedIn]);

  const getPostAuthScreen = (): ScreenId => (isLoggedIn ? 'home' : 'login');

  const handleNavigateFromOnboarding = (screen: ScreenId) => {
    if (screen === 'home') {
      setActiveNavbarTab('home');
      setHasCompletedOnboarding(true);
      setActiveScreen(getPostAuthScreen());
      return;
    }
    setActiveScreen(screen);
  };

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
