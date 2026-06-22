/**
 * SettingsScreen - 设置页
 *
 * 从原 ProfileAndSettings.tsx 拆分而来。
 * 功能：应用设置页面，包含偏好设置（语言/距离单位/语音播报/偏离振动）、
 *       地图与导航设置（地图样式/轨迹线粗细）、应用信息（版本/隐私/协议）
 *       以及缓存清理功能。支持多种底部弹窗选择器交互。
 *
 * @source 拆分自 components/ProfileAndSettings.tsx (SCREEN 13)
 */

import React, { useEffect, useState } from 'react';
import {
  Activity,
  Globe,
  Ruler,
  Volume2,
  Smartphone,
  Map,
  Info,
  Lock,
  FileText,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import { ScreenId } from '../../types';
import { useI18n } from '../../i18n';
import { useToast } from '../common/Toast';
import { clearUserCache, getCurrentUserProfile, updateUserSettings, type UserProfile, type UserSettings } from '../../api/user';
import { getAvailableProviders, setMapProvider, getDefaultMapProvider, getProviderLabel } from '../../api/mapConfig';
import { providerLabel } from './profile-settings-utils';

/* ==========================================
   Settings Screen (设置页)
   ========================================== */
interface SettingsScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onNavigate }) => {
  // Settings control states
  const [voiceBroadcast, setVoiceBroadcast] = useState(true);
  const [vibeDeviation, setVibeDeviation] = useState(true);
  const [distanceUnit, setDistanceUnit] = useState<'km' | 'mile'>('km');
  const { t, text, language, setLanguage, languageOptions } = useI18n();
  const { showToast } = useToast();
  const [mapStyleStyle, setMapStyleStyle] = useState<'light' | 'satellite'>('light');
  const [lineWeightThickness, setLineWeightThickness] = useState<'mid' | 'thick' | 'thin'>('mid');
  const [cacheMemoryMB, setCacheMemoryMB] = useState(128);
  const [cacheClearing, setCacheClearing] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const [showLanguageSheet, setShowLanguageSheet] = useState(false);
  const [showMapSheet, setShowMapSheet] = useState(false);
  const [showProviderSheet, setShowProviderSheet] = useState(false);
  const [showThicknessSheet, setShowThicknessSheet] = useState(false);
  const [currentProvider, setCurrentProvider] = useState<string>('amap');
  const [availableProviders, setAvailableProviders] = useState<Array<{ key: string; label: string; hasApiKey: boolean }>>([]);

  useEffect(() => {
    getCurrentUserProfile()
      .then((nextProfile) => {
        setProfile(nextProfile);
        setDistanceUnit(nextProfile.settings.distanceUnit);
        setVoiceBroadcast(nextProfile.settings.voiceBroadcast);
        setVibeDeviation(nextProfile.settings.vibeDeviation);
        setMapStyleStyle(nextProfile.settings.mapStyle);
        setLineWeightThickness(nextProfile.settings.lineWeight);
      })
      .catch(() => showToast(text('设置数据加载失败', 'Failed to load settings')));
    // 加载当前地图服务商和可用列表
    getDefaultMapProvider().then((provider) => setCurrentProvider(provider));
    getAvailableProviders().then((providers) => setAvailableProviders(providers));
  }, [showToast, text]);

  const persistSettings = (patch: Partial<UserSettings>) => {
    updateUserSettings(patch)
      .then((nextProfile) => setProfile(nextProfile))
      .catch(() => showToast(text('设置保存失败，请稍后重试', 'Failed to save settings')));
  };

  const clearCacheAction = async () => {
    if (cacheMemoryMB === 0) {
      showToast(text('缓存已被完全清空，无需二次清除', 'Cache has already been cleared'));
      return;
    }
    showToast(text('正在为您深度清扫文件及地图轨迹图缓存...', 'Clearing files and route cache...'));
    setCacheClearing(true);
    try {
      const result = await clearUserCache();
      setCacheMemoryMB(0);
      showToast(text(`已清理 ${result.removedAssets} 条缓存资源`, `${result.removedAssets} cached assets cleared`));
    } catch {
      showToast(text('缓存清理失败，请稍后重试', 'Cache clear failed. Try again later.'));
    } finally {
      setCacheClearing(false);
    }
  };

  const openLegalDocument = (screen: 'privacy_policy' | 'user_agreement' | 'permission_notice') => {
    try {
      sessionStorage.setItem('tracecraft_legal_return_screen', 'settings');
    } catch {
      // Ignore sessionStorage failures.
    }
    onNavigate(screen);
  };

  return (
    <div className="flex flex-col min-h-full bg-[linear-gradient(180deg,#f7fbff_0%,#ffffff_24%,#eef7ff_100%)] text-slate-800 select-none relative">

      {/* 1. TOP TITLE AREA BACK-HEADER */}
      <div className="h-[48px] border-b border-gray-100 flex items-center justify-between px-4 sticky top-0 bg-white/95 backdrop-blur-md z-10 shrink-0">
        <button 
          id="btn_settings_back"
          onClick={() => onNavigate('profile')} 
          className="w-9 h-9 rounded-full bg-gray-50 active:bg-gray-100 flex justify-center items-center text-slate-600 transition-colors"
          title={t('settings.back', '返回个人中心')}
        >
          <ArrowLeft size={18} className="stroke-[2.5]" />
        </button>
        <h2 className="text-[16px] font-black text-slate-800">{t('settings.title', '设置')}</h2>
        <div className="w-9"></div>
      </div>

      {/* Scrollable Container */}
      <div className="flex-1 overflow-y-auto bg-gray-50/50 pb-8">
        
        {/* User Info Micro-Card in top of settings */}
        <div className="bg-white p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center text-xl shrink-0 font-bold border border-gray-200">
              🏃‍♂️
            </div>
            <div>
              <h4 className="text-[14px] font-bold text-slate-800">{profile?.displayName || t('profile.nickname', '跑者小明')}</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">UID: {profile?.userId || '...'}</p>
            </div>
          </div>
          <div className="flex items-center space-x-1.5 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full text-[11px] text-emerald-600">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
            <span className="font-bold">{providerLabel(profile?.authProvider || '', text)}</span>
          </div>
        </div>

        {/* SECTION GROUP 1: 偏好设置 */}
        <div className="bg-gray-100 h-2.5"></div>
        <div className="bg-white">
          <div className="px-4 py-2 bg-gray-50/60 border-b border-gray-100">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">{t('settings.section_common', '偏好设置')}</span>
          </div>

          <div className="divide-y divide-gray-100">
            {/* Setting 1: Language */}
            <div 
              id="set_language"
              onClick={() => setShowLanguageSheet(true)}
              className="h-[56px] px-4 flex items-center justify-between active:bg-slate-50 cursor-pointer transition-colors"
            >
              <div className="flex items-center space-x-3">
                <Globe size={18} className="text-[#4FACFE] stroke-[2.3]" />
                <span className="text-[15px] font-medium text-slate-700">{t('settings.lang', '语言')}</span>
              </div>
              <div className="flex items-center space-x-1.5 text-slate-400">
                <span className="text-[14px] font-semibold text-slate-500">
                  {language === 'cn' ? t('settings.lang_cn', '中文') : t('settings.lang_en', 'English')}
                </span>
                <ChevronRight size={16} />
              </div>
            </div>

            {/* Setting 2: Distance Unit Toggle */}
            <div 
              id="set_distance_unit"
              onClick={() => {
                const nextUnit = distanceUnit === 'km' ? 'mile' : 'km';
                setDistanceUnit(nextUnit);
                persistSettings({ distanceUnit: nextUnit });
                showToast(nextUnit === 'km'
                  ? text('单位已切回: 公里 (Km)', 'Units switched to: kilometers (km)')
                  : text('单位已切回: 英里 (Mile)', 'Units switched to: miles'));
              }}
              className="h-[56px] px-4 flex items-center justify-between active:bg-slate-50 cursor-pointer transition-colors"
            >
              <div className="flex items-center space-x-3">
                <Ruler size={18} className="text-[#4FACFE] stroke-[2.3]" />
                <span className="text-[15px] font-medium text-slate-700">{t('settings.distance_unit', '距离单位')}</span>
              </div>
              <div className="flex items-center space-x-1.5 text-slate-400">
                <span className="text-[14px] font-semibold text-slate-500">
                  {distanceUnit === 'km' ? t('settings.km', '公里') : t('settings.mile', '英里')}
                </span>
                <ChevronRight size={16} />
              </div>
            </div>

            {/* Setting 3: Voice broadcast switch */}
            <div className="h-[56px] px-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Volume2 size={18} className="text-[#4FACFE] stroke-[2.3]" />
                <span className="text-[15px] font-medium text-slate-700">{t('settings.voice', '语音播报')}</span>
              </div>
              
              <button
                id="toggle_voice"
                onClick={() => {
                  setVoiceBroadcast(!voiceBroadcast);
                  persistSettings({ voiceBroadcast: !voiceBroadcast });
                  showToast(!voiceBroadcast ? t('settings.voice_on', '语音已开启') : t('settings.voice_off', '语音已关闭'));
                }}
                className={`w-11.5 h-6 rounded-full p-0.5 transition-colors duration-200 outline-none ease-in ${
                  voiceBroadcast ? 'bg-[#4FACFE]' : 'bg-slate-200'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform duration-200 ${
                  voiceBroadcast ? 'translate-x-5.5' : 'translate-x-0'
                }`}></div>
              </button>
            </div>

            {/* Setting 4: Vibrate on deviation */}
            <div className="h-[56px] px-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Smartphone size={18} className="text-[#4FACFE] stroke-[2.3]" />
                <span className="text-[15px] font-medium text-slate-700">{t('settings.vibrate', '偏离时振动')}</span>
              </div>

              <button
                id="toggle_vibration"
                onClick={() => {
                  setVibeDeviation(!vibeDeviation);
                  persistSettings({ vibeDeviation: !vibeDeviation });
                  showToast(!vibeDeviation ? t('settings.vibrate_on', '震动已开启') : t('settings.vibrate_off', '震动已关闭'));
                }}
                className={`w-11.5 h-6 rounded-full p-0.5 transition-colors duration-200 outline-none ease-in ${
                  vibeDeviation ? 'bg-[#4FACFE]' : 'bg-slate-200'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform duration-200 ${
                  vibeDeviation ? 'translate-x-5.5' : 'translate-x-0'
                }`}></div>
              </button>
            </div>
          </div>
        </div>

        {/* SECTION GROUP 2: 地图与导航 */}
        <div className="bg-gray-100 h-2.5"></div>
        <div className="bg-white">
          <div className="px-4 py-2 bg-gray-55/40 border-b border-gray-100">
            <span className="text-[11px] font-extrabold text-slate-400 tracking-widest uppercase">{t('settings.section_map', '地图与导航')}</span>
          </div>

          <div className="divide-y divide-gray-100">
            {/* Setting 5: Map profile style */}
            <div 
              onClick={() => setShowMapSheet(true)}
              className="h-[56px] px-4 flex items-center justify-between active:bg-slate-50 cursor-pointer transition-colors"
            >
              <div className="flex items-center space-x-3">
                <Map size={18} className="text-[#4FACFE] stroke-[2.3]" />
                <span className="text-[15px] font-medium text-slate-700">{t('settings.map_style', '地图样式')}</span>
              </div>
              <div className="flex items-center space-x-1.5 text-slate-400">
                <span className="text-[14px] font-semibold text-slate-500 font-sans">
                  {mapStyleStyle === 'light' ? t('settings.light', '浅色') : t('settings.dark', '卫星')}
                </span>
                <ChevronRight size={16} />
              </div>
            </div>

            {/* Setting 5.5: Map Provider */}
            <div
              id="set_map_provider"
              onClick={() => setShowProviderSheet(true)}
              className="h-[56px] px-4 flex items-center justify-between active:bg-slate-50 cursor-pointer transition-colors"
            >
              <div className="flex items-center space-x-3">
                <Globe size={18} className="text-[#4FACFE] stroke-[2.3]" />
                <span className="text-[15px] font-medium text-slate-700">{text('地图服务商', 'Map Provider')}</span>
              </div>
              <div className="flex items-center space-x-1.5 text-slate-400">
                <span className="text-[14px] font-semibold text-slate-500">
                  {getProviderLabel(currentProvider as 'amap' | 'google' | 'baidu') || currentProvider}
                </span>
                <ChevronRight size={16} />
              </div>
            </div>

            {/* Setting 6: Trajectory line thickness */}
            <div 
              onClick={() => setShowThicknessSheet(true)}
              className="h-[56px] px-4 flex items-center justify-between active:bg-slate-50 cursor-pointer transition-colors"
            >
              <div className="flex items-center space-x-3">
                <Activity size={18} className="text-[#4FACFE] stroke-[2.3]" />
                <span className="text-[15px] font-medium text-slate-700">{t('settings.line_thickness', '轨迹线粗细')}</span>
              </div>
              <div className="flex items-center space-x-1.5 text-slate-400">
                <span className="text-[14px] font-semibold text-slate-500">
                  {lineWeightThickness === 'mid' ? t('settings.normal', '中') : lineWeightThickness === 'thick' ? t('settings.thick', '粗') : t('settings.thin', '细')}
                </span>
                <ChevronRight size={16} />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION GROUP 3: 应用信息 */}
        <div className="bg-gray-100 h-2.5"></div>
        <div className="bg-white">
          <div className="px-4 py-2 bg-gray-55/40 border-b border-gray-100">
            <span className="text-[11px] font-extrabold text-slate-400 tracking-widest uppercase">{t('settings.section_app', '应用信息')}</span>
          </div>

          <div className="divide-y divide-gray-100">
            {/* Setting 7: Current version */}
            <div 
              onClick={() => showToast(text('轨迹工坊官方尝鲜版 v1.0.0, 编译于2026年6月', 'TraceCraft preview v1.0.0, built in June 2026'))}
              className="h-[56px] px-4 flex items-center justify-between text-slate-700"
            >
              <div className="flex items-center space-x-3">
                <Info size={18} className="text-[#4FACFE] stroke-[2.3]" />
                <span className="text-[15px] font-medium">{t('settings.current_version', '当前版本')}</span>
              </div>
              <span className="text-[14px] font-mono font-semibold text-slate-400">v1.0.0</span>
            </div>

            {/* Setting 8: Version check */}
            <div 
              id="set_version_check"
              onClick={() => showToast(text('目前内核已是最新的，无可用更新。', 'You are already on the latest version.'))}
              className="h-[56px] px-4 flex items-center justify-between active:bg-slate-50 cursor-pointer transition-colors"
            >
              <div className="flex items-center space-x-3">
                <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] text-[#4FACFE] fill-none stroke-current stroke-2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span className="text-[15px] font-medium text-slate-700">{t('settings.version_check', '版本更新')}</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="text-[12px] font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full">{t('settings.latest', '已是最新版本')}</span>
                <ChevronRight size={16} className="text-slate-300" />
              </div>
            </div>

            {/* Setting 9: Privacy policy */}
            <div 
              onClick={() => openLegalDocument('privacy_policy')}
              className="h-[56px] px-4 flex items-center justify-between active:bg-slate-50 cursor-pointer transition-colors"
            >
              <div className="flex items-center space-x-3">
                <Lock size={18} className="text-[#4FACFE] stroke-[2.3]" />
                <span className="text-[15px] font-medium text-slate-700">{t('settings.privacy', '隐私政策')}</span>
              </div>
              <ChevronRight size={16} className="text-slate-300" />
            </div>

            {/* Setting 10: Service agreement */}
            <div 
              onClick={() => openLegalDocument('user_agreement')}
              className="h-[56px] px-4 flex items-center justify-between active:bg-slate-50 cursor-pointer transition-colors"
            >
              <div className="flex items-center space-x-3">
                <FileText size={18} className="text-[#4FACFE] stroke-[2.3]" />
                <span className="text-[15px] font-medium text-slate-700">{t('settings.service_protocol', '用户协议')}</span>
              </div>
              <ChevronRight size={16} className="text-slate-300" />
            </div>

            {/* Setting 11: Permission notice */}
            <div
              onClick={() => openLegalDocument('permission_notice')}
              className="h-[56px] px-4 flex items-center justify-between active:bg-slate-50 cursor-pointer transition-colors"
            >
              <div className="flex items-center space-x-3">
                <Smartphone size={18} className="text-[#4FACFE] stroke-[2.3]" />
                <span className="text-[15px] font-medium text-slate-700">{text('权限使用说明', 'Permission Notice')}</span>
              </div>
              <ChevronRight size={16} className="text-slate-300" />
            </div>
          </div>
        </div>

        {/* BOTTOM CACHE STATISTICS & RESET SYSTEM */}
        <div className="bg-gray-100 h-2.5"></div>
        <div className="flex flex-col items-center justify-center p-6 bg-white border-t border-gray-100">
            <span className="text-[12px] text-slate-400 font-mono">
            {t('settings.cache_value', '缓存')}：{cacheMemoryMB}MB
          </span>
          <button
            id="btn_clear_cache"
            onClick={() => void clearCacheAction()}
            disabled={cacheClearing}
            className="text-[12.5px] font-extrabold text-[#4FACFE] mt-2 border border-[#4FACFE]/20 hover:bg-teal-50 px-5 py-2 rounded-full active:scale-95 transition-all outline-none disabled:opacity-60"
          >
            {cacheClearing ? text('清理中...', 'Clearing...') : t('settings.clear_cache', '清除缓存')}
          </button>
        </div>

      </div>

      {/* Language Choice Drawer Sheet */}
      {showLanguageSheet && (
        <div className="absolute inset-0 bg-black/45 backdrop-blur-xs flex items-end justify-center z-40">
          <div className="w-full bg-white rounded-t-[28px] p-5 shadow-2xl flex flex-col space-y-3.5 max-h-[50%] animate-slide-up">
            <h3 className="text-sm font-black text-slate-800 text-center pb-2 border-b">{t('settings.switch_language_title', '切换显示语言 (Switch Language)')}</h3>
            {languageOptions.map((locale) => (
              <button
                key={locale}
                onClick={() => {
                  setLanguage(locale);
                  setShowLanguageSheet(false);
                  showToast(locale === 'cn'
                    ? t('settings.lang_switch_cn', '已切换显示为: 简体中文')
                    : t('settings.lang_switch_en', 'Language switched to English'));
                }}
                className={`py-3 rounded-xl font-bold text-xs flex justify-between px-4 ${
                  language === locale ? 'bg-[#4FACFE]/10 text-[#4FACFE]' : 'bg-slate-50 text-slate-700'
                }`}
              >
                <span>{locale === 'cn' ? t('settings.lang_cn', '中文') : t('settings.lang_en', 'English')}</span>
                {language === locale && <span>✓</span>}
              </button>
            ))}
            <button 
              onClick={() => setShowLanguageSheet(false)}
              className="py-2 bg-slate-100 text-slate-500 font-bold rounded-xl text-xs text-center"
            >
              {t('settings.return', '返回')}
            </button>
          </div>
        </div>
      )}

      {/* Map Choice Drawer Sheet */}
      {showMapSheet && (
        <div className="absolute inset-0 bg-black/45 backdrop-blur-xs flex items-end justify-center z-40">
          <div className="w-full bg-white rounded-t-[28px] p-5 shadow-2xl flex flex-col space-y-3.5 max-h-[50%] animate-slide-up">
            <h3 className="text-sm font-black text-slate-800 text-center pb-2 border-b">{t('settings.map_sheet_title', '切换底层地图网样式')}</h3>
            <button 
              onClick={() => { setMapStyleStyle('light'); persistSettings({ mapStyle: 'light' }); setShowMapSheet(false); showToast(text('地图样式已设置为: 浅色模式', 'Map style set to: Light')); }}
              className={`py-3 rounded-xl font-bold text-xs flex justify-between px-4 ${mapStyleStyle === 'light' ? 'bg-[#4FACFE]/10 text-[#4FACFE]' : 'bg-slate-50 text-slate-700'}`}
            >
              <span>{t('settings.map_light_option', '浅色模式地图 (矢量网格)')}</span>
              {mapStyleStyle === 'light' && <span>✓</span>}
            </button>
            <button 
              onClick={() => { setMapStyleStyle('satellite'); persistSettings({ mapStyle: 'satellite' }); setShowMapSheet(false); showToast(text('地图样式已设置为: 遥感卫星高清', 'Map style set to: Satellite')); }}
              className={`py-3 rounded-xl font-bold text-xs flex justify-between px-4 ${mapStyleStyle === 'satellite' ? 'bg-[#4FACFE]/10 text-[#4FACFE]' : 'bg-slate-50 text-slate-700'}`}
            >
              <span>{t('settings.map_satellite_option', '遥感卫星高清图 (街道重叠)')}</span>
              {mapStyleStyle === 'satellite' && <span>✓</span>}
            </button>
            <button 
              onClick={() => setShowMapSheet(false)}
              className="py-2 bg-slate-100 text-slate-500 font-bold rounded-xl text-xs text-center"
            >
              {t('settings.cancel', '取消')}
            </button>
          </div>
        </div>
      )}

      {/* Thickness Choice Drawer Sheet */}
      {showThicknessSheet && (
        <div className="absolute inset-0 bg-black/45 backdrop-blur-xs flex items-end justify-center z-40">
          <div className="w-full bg-white rounded-t-[28px] p-5 shadow-2xl flex flex-col space-y-3.5 max-h-[50%] animate-slide-up">
            <h3 className="text-sm font-black text-slate-800 text-center pb-2 border-b">{t('settings.thickness_sheet_title', '修改地图发光轨迹线粗细')}</h3>
            <button 
              onClick={() => { setLineWeightThickness('thin'); persistSettings({ lineWeight: 'thin' }); setShowThicknessSheet(false); showToast(text('轨迹线：精致极细', 'Route line: Thin')); }}
              className={`py-3 rounded-xl font-bold text-xs flex justify-between px-4 ${lineWeightThickness === 'thin' ? 'bg-[#4FACFE]/10 text-[#4FACFE]' : 'bg-slate-50 text-slate-700'}`}
            >
              <span>{t('settings.thickness_thin_option', '精致极细 (1.5px)')}</span>
              {lineWeightThickness === 'thin' && <span>✓</span>}
            </button>
            <button 
              onClick={() => { setLineWeightThickness('mid'); persistSettings({ lineWeight: 'mid' }); setShowThicknessSheet(false); showToast(text('轨迹线：中等大小', 'Route line: Medium')); }}
              className={`py-3 rounded-xl font-bold text-xs flex justify-between px-4 ${lineWeightThickness === 'mid' ? 'bg-[#4FACFE]/10 text-[#4FACFE]' : 'bg-slate-50 text-slate-700'}`}
            >
              <span>{t('settings.thickness_mid_option', '中等粗细 (3.5px)')}</span>
              {lineWeightThickness === 'mid' && <span>✓</span>}
            </button>
            <button 
              onClick={() => { setLineWeightThickness('thick'); persistSettings({ lineWeight: 'thick' }); setShowThicknessSheet(false); showToast(text('轨迹线：醒目极粗', 'Route line: Bold')); }}
              className={`py-3 rounded-xl font-bold text-xs flex justify-between px-4 ${lineWeightThickness === 'thick' ? 'bg-[#4FACFE]/10 text-[#4FACFE]' : 'bg-slate-50 text-[#4FACFE]'}`}
            >
              <span>{t('settings.thickness_thick_option', '醒目超粗 (6.0px)')}</span>
              {lineWeightThickness === 'thick' && <span>✓</span>}
            </button>
            <button 
              onClick={() => setShowThicknessSheet(false)}
              className="py-2 bg-slate-100 text-slate-500 font-bold rounded-xl text-xs text-center"
            >
              {t('settings.cancel', '取消')}
            </button>
          </div>
        </div>
      )}

      {/* Map Provider Choice Drawer Sheet */}
      {showProviderSheet && (
        <div className="absolute inset-0 bg-black/45 backdrop-blur-xs flex items-end justify-center z-40">
          <div className="w-full bg-white rounded-t-[28px] p-5 shadow-2xl flex flex-col space-y-3.5 max-h-[50%] animate-slide-up">
            <h3 className="text-sm font-black text-slate-800 text-center pb-2 border-b">{text('切换地图服务商', 'Switch Map Provider')}</h3>
            {availableProviders.map((provider) => (
              <button
                key={provider.key}
                onClick={() => {
                  setMapProvider(provider.key as 'amap' | 'google' | 'baidu');
                  setCurrentProvider(provider.key);
                  setShowProviderSheet(false);
                  showToast(text(`已切换到${provider.label}`, `Switched to ${provider.label}`));
                }}
                className={`py-3 rounded-xl font-bold text-xs flex justify-between px-4 ${currentProvider === provider.key ? 'bg-[#4FACFE]/10 text-[#4FACFE]' : 'bg-slate-50 text-slate-700'}`}
              >
                <span>{provider.label}{!provider.hasApiKey && ' (未配置)'}</span>
                {currentProvider === provider.key && <span>✓</span>}
              </button>
            ))}
            <button
              onClick={() => setShowProviderSheet(false)}
              className="py-2 bg-slate-100 text-slate-500 font-bold rounded-xl text-xs text-center"
            >
              {t('settings.cancel', '取消')}
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
