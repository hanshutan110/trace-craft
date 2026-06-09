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
  const clearBottomSheet = () => {
    setIsBottomSheetOpen(false);
  };

  const closeBottomSheet = () => {
    clearBottomSheet();
    setActiveScreen('param_adjust');
  };

  const selectShapeFromBottomSheet = (shapeId: string) => {
    onSelectShape(shapeId);
  };

  return (
    <div id="right_panel" className="w-full min-h-screen bg-slate-950">
      <div
        id="app_surface"
        className="relative w-full min-h-screen bg-white flex flex-col overflow-hidden"
      >
        <div className="flex-1 w-full relative flex flex-col bg-white overflow-hidden text-slate-900 select-none">
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

