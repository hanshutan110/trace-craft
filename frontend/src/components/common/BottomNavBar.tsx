/**
 * 底部导航栏组件
 *
 * 固定在屏幕底部，包含三个标签页：
 *   - 首页（home）
 *   - 我的轨迹（traces）
 *   - 个人中心（profile）
 *
 * 支持国际化标签文案，当前选中标签高亮为主题色
 */
import React from 'react';
import { Home, Activity, User } from 'lucide-react';
import { ScreenId } from '../../types';
import { useI18n } from '../../i18n';

/** 底部导航栏标签类型 */
type BottomNavTab = 'home' | 'traces' | 'profile';

interface BottomNavBarProps {
  onNavigate: (screen: ScreenId) => void;
  activeNavbarTab: BottomNavTab;
  setActiveNavbarTab: (tab: BottomNavTab) => void;
  iconSize?: number;
  className?: string;
  labelClassName?: string;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  onNavigate,
  activeNavbarTab,
  setActiveNavbarTab,
  iconSize = 20,
  className = '',
  labelClassName = 'text-[10px] font-medium mt-1',
}) => {
  const { t } = useI18n();

  const navClass = (tab: BottomNavTab) =>
    `flex flex-col items-center justify-center flex-1 py-1.5 ${
      activeNavbarTab === tab ? 'text-[#4FACFE]' : 'text-slate-400'
    }`;

  return (
    <div className={`fixed inset-x-0 bottom-0 bg-white border-t border-slate-100 flex items-center justify-around px-4 z-30 pb-[env(safe-area-inset-bottom)] ${className}`}>
      <button
        onClick={() => {
          setActiveNavbarTab('home');
          onNavigate('home');
        }}
        className={navClass('home')}
      >
        <Home size={iconSize} className="mb-0.5" />
        <span className={labelClassName}>{t('home.nav.home', '首页')}</span>
      </button>

      <button
        onClick={() => {
          setActiveNavbarTab('traces');
          onNavigate('my_traces');
        }}
        className={navClass('traces')}
      >
        <Activity size={iconSize} className="mb-0.5" />
        <span className={labelClassName}>{t('home.nav.traces', '我的轨迹')}</span>
      </button>

      <button
        onClick={() => {
          setActiveNavbarTab('profile');
          onNavigate('profile');
        }}
        className={navClass('profile')}
      >
        <User size={iconSize} className="mb-0.5" />
        <span className={labelClassName}>{t('home.nav.profile', '个人中心')}</span>
      </button>
    </div>
  );
};

