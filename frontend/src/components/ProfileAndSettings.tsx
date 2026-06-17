import React, { useEffect, useState } from 'react';
import {
  Heart,
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
  Clock,
  Settings,
  QrCode,
  Camera,
  HelpCircle,
  ArrowLeft,
  Image as ImageIcon,
} from 'lucide-react';
import { ScreenId } from '../types';
import { useI18n } from '../i18n';
import { useToast } from './common/Toast';
import { BottomNavBar } from './common/BottomNavBar';
import { getCurrentUserProfile, updateUserSettings, type UserProfile, type UserSettings } from '../api/user';

function providerLabel(provider: string, text: (cn: string, en: string) => string): string {
  if (provider === 'wechat') return text('已绑定微信', 'WeChat linked');
  if (provider === 'alipay') return text('已绑定支付宝', 'Alipay linked');
  if (provider === 'phone') return text('已绑定手机号', 'Phone linked');
  return text('游客账号', 'Guest account');
}

/* ==========================================
   Screen 12: Profile Center Screen (个人中心页)
   ========================================== */
interface ProfileScreenProps {
  onNavigate: (screen: ScreenId) => void;
  activeNavbarTab: 'home' | 'traces' | 'profile';
  setActiveNavbarTab: (tab: 'home' | 'traces' | 'profile') => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  onNavigate,
  activeNavbarTab,
  setActiveNavbarTab,
}) => {
  const { t, text } = useI18n();
  const { showToast } = useToast();
  const [showQRModal, setShowQRModal] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    getCurrentUserProfile()
      .then(setProfile)
      .catch(() => showToast(text('个人数据加载失败', 'Failed to load profile')));
  }, [showToast, text]);

  const stats = profile?.stats || {
    totalDistanceKm: 0,
    totalDurationHours: 0,
    totalRoutes: 0,
    completedRuns: 0,
    favoriteCount: 0,
  };

  return (
    <div className="flex flex-col min-h-full bg-[linear-gradient(180deg,#f7fbff_0%,#ffffff_24%,#eef7ff_100%)] text-slate-800 select-none relative pb-[calc(96px+env(safe-area-inset-bottom))]">

      {/* Main Content Area Scrollable */}
      <div className="flex-1 overflow-y-auto pb-4 pt-4 shrink-0">
        
        {/* Page title header */}
        <div className="text-center pb-4 pt-1">
          <h2 className="text-[17px] font-extrabold text-slate-800">{t('profile.title', '个人中心')}</h2>
        </div>

        {/* 1. User Info Card */}
        <div 
          id="user_info_card"
          className="mx-4 bg-white rounded-[24px] p-4 border border-gray-100/80 shadow-[0_4px_16px_rgba(0,0,0,0.03)] flex flex-col justify-between relative mb-5 group hover:border-[#4FACFE]/20 transition-all"
        >
          <div className="flex items-center justify-between pb-3.5 border-b border-gray-100">
            <div className="flex items-center space-x-3.5">
              
              {/* Profile Avatar with clickable edit indicator */}
              <div 
                onClick={() => showToast(text('上传个人照片头像功能正在建设中', 'Profile photo upload is under construction'))}
                className="w-16 h-16 rounded-full bg-slate-100 border-2 border-slate-200/60 relative cursor-pointer group-hover:border-[#00F2FE]/50 transition-colors flex items-center justify-center shrink-0 overflow-hidden"
              >
                {/* Running avatar graphic */}
                <span className="text-2xl">🏃‍♂️</span>
                
                {/* Mini Edit Camera overlay */}
                <div className="absolute bottom-0 right-0 w-5 h-5 bg-gradient-to-r from-[#4FACFE] to-[#00F2FE] text-white rounded-full flex items-center justify-center border border-white shrink-0">
                  <Camera size={10} className="stroke-[2.5]" />
                </div>
              </div>

              {/* Text Info */}
              <div>
                <h3 className="text-[18px] font-black text-slate-800 flex items-center gap-1">
                <span>{profile?.displayName || t('profile.nickname', '跑者小明')}</span>
                  <span className="text-[9px] font-bold bg-[#4FACFE]/10 text-[#4FACFE] px-1.5 py-0.5 rounded-full">{profile?.badge || t('profile.badge', '中级达人')}</span>
                </h3>
                <p className="text-[12px] text-slate-400 mt-1 font-mono">ID: {profile?.userId || '...'}</p>
              </div>
            </div>

            {/* Right Side: Clickable QR Code */}
            <button
              id="btn_view_qrcode"
              onClick={() => setShowQRModal(true)}
              className="w-9 h-9 rounded-full bg-teal-50 flex items-center justify-center text-[#4FACFE] hover:bg-teal-100/65 active:scale-95 transition-all outline-none"
            title={t('profile.qr_title', '显示个人二维码')}
            >
              <QrCode size={18} className="stroke-[2.5]" />
            </button>
          </div>

          {/* Slogan Quote Bottom line inside card */}
          <div className="pt-2 px-1 flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <span>{profile?.signature || t('profile.signature', '个性签名: 用汗水在水泥地上书写画作')}</span>
            <span className="text-[#00F2FE]/90 font-bold hover:underline cursor-pointer" onClick={() => showToast(t('profile.signature_edit_toast', '个性签名修改'))}>{t('profile.edit', '修改')}</span>
          </div>
        </div>

        {/* 2. Stats Counters Tri-column */}
        <div className="px-4 grid grid-cols-3 gap-3 mb-6">
          {/* Box 1 */}
          <div 
            onClick={() => showToast(text(`累计跑步 ${stats.totalDistanceKm} 公里`, `Total distance ${stats.totalDistanceKm} km`))}
            className="bg-white rounded-[16px] p-3.5 border border-gray-100 shadow-[0_4px_12px_rgba(0,0,0,0.02)] text-center flex flex-col justify-center active:scale-98 transition-all hover:border-[#4FACFE]/10 cursor-pointer"
          >
            <span className="text-[20px] font-extrabold text-slate-800 leading-tight">{stats.totalDistanceKm}</span>
            <span className="text-[11px] text-slate-400 mt-1">{t('profile.stats_distance', '总距离 (km)')}</span>
          </div>

          {/* Box 2 */}
          <div 
            onClick={() => showToast(text(`累计运动 ${stats.totalDurationHours} 小时`, `Total duration ${stats.totalDurationHours} hours`))}
            className="bg-white rounded-[16px] p-3.5 border border-gray-100 shadow-[0_4px_12px_rgba(0,0,0,0.02)] text-center flex flex-col justify-center active:scale-98 transition-all hover:border-[#4FACFE]/10 cursor-pointer"
          >
            <span className="text-[20px] font-extrabold text-slate-800 leading-tight">{stats.totalDurationHours}</span>
            <span className="text-[11px] text-slate-400 mt-1">{t('profile.stats_time', '总时长 (时)')}</span>
          </div>

          {/* Box 3 */}
          <div 
            onClick={() => showToast(text(`已创建 ${stats.totalRoutes} 条轨迹`, `${stats.totalRoutes} routes created`))}
            className="bg-white rounded-[16px] p-3.5 border border-gray-100 shadow-[0_4px_12px_rgba(0,0,0,0.02)] text-center flex flex-col justify-center active:scale-98 transition-all hover:border-[#4FACFE]/10 cursor-pointer"
          >
            <span className="text-[20px] font-extrabold text-slate-800 leading-tight">{stats.totalRoutes}</span>
            <span className="text-[11px] text-slate-400 mt-1">{t('profile.stats_traces', '完成轨迹 (个)')}</span>
          </div>
        </div>

        {/* 3. Function List group 1: 我的内容 */}
        <div className="mb-4">
          <h4 className="text-[14px] font-bold text-slate-500 mb-2.5 px-4">{t('profile.section_content', '我的内容')}</h4>
          <div className="bg-white border-y border-gray-50 divide-y divide-gray-100">
            {/* Item 1 */}
            <div 
              onClick={() => onNavigate('my_traces')}
              className="flex items-center justify-between py-3.5 px-4 active:bg-gray-55/60 transition-colors cursor-pointer"
            >
              <div className="flex items-center space-x-3 text-slate-700">
                <ImageIcon size={18} className="text-[#4FACFE] stroke-[2.3]" />
                <span className="text-[16px] font-medium">{t('profile.item.traces', '我的轨迹作品')}</span>
              </div>
              <div className="flex items-center space-x-1 text-slate-400">
                <span className="text-[12px] font-semibold bg-slate-100 px-2 py-0.5 rounded-full text-slate-500">{stats.totalRoutes}</span>
                <ChevronRight size={16} />
              </div>
            </div>

            {/* Item 2 */}
            <div 
              onClick={() => onNavigate('run_history')}
              className="flex items-center justify-between py-3.5 px-4 active:bg-gray-55/60 transition-colors cursor-pointer"
            >
              <div className="flex items-center space-x-3 text-slate-700">
                <Clock size={18} className="text-[#4FACFE] stroke-[2.3]" />
                <span className="text-[16px] font-medium">{t('profile.item.history', '历史记录')}</span>
              </div>
              <ChevronRight size={16} className="text-slate-300" />
            </div>

            {/* Item 3 */}
            <div 
              onClick={() => onNavigate('favorites')}
              className="flex items-center justify-between py-3.5 px-4 active:bg-gray-55/60 transition-colors cursor-pointer"
            >
              <div className="flex items-center space-x-3 text-slate-700">
                <Heart size={18} className="text-[#4FACFE] stroke-[2.3]" />
                <span className="text-[16px] font-medium">{t('profile.item.favorites', '收藏模板')}</span>
              </div>
              <div className="flex items-center space-x-1 text-slate-400">
                <span className="text-[12px] font-semibold bg-pink-50 text-pink-500 px-2 py-0.5 rounded-full">{stats.favoriteCount}</span>
                <ChevronRight size={16} />
              </div>
            </div>
          </div>
        </div>

        {/* 4. Function List group 2: 其他 (点击设置可直达其子级13!) */}
        <div className="mb-6">
          <h4 className="text-[14px] font-bold text-slate-500 mb-2.5 px-4">{t('profile.section_other', '其他')}</h4>
          <div className="bg-white border-y border-gray-50 divide-y divide-gray-100">
            {/* Item 4 - Settings (Goes directly to settings screen!) */}
            <div 
              id="btn_go_settings"
              onClick={() => onNavigate('settings')}
              className="flex items-center justify-between py-3.5 px-4 active:bg-gray-55/60 transition-colors cursor-pointer"
            >
              <div className="flex items-center space-x-3 text-slate-700">
                <Settings size={18} className="text-[#4FACFE] stroke-[2.3]" />
                <span className="text-[16px] font-medium">{t('profile.item.settings', '设置')}</span>
              </div>
              <ChevronRight size={16} className="text-slate-300" />
            </div>

            {/* Item 5 - About Us */}
            <div 
              onClick={() => showToast(text('轨迹工坊 App - 跑出不一样的运动奇遇。当前版本 v1.0.0', 'TraceCraft - run a different kind of adventure. Current version v1.0.0'))}
              className="flex items-center justify-between py-3.5 px-4 active:bg-gray-55/60 transition-colors cursor-pointer"
            >
              <div className="flex items-center space-x-3 text-slate-700">
                <Info size={18} className="text-[#4FACFE] stroke-[2.3]" />
                <span className="text-[16px] font-medium">{t('profile.item.about', '关于我们')}</span>
              </div>
              <ChevronRight size={16} className="text-slate-300" />
            </div>

            {/* Item 6 - Feedback help */}
            <div 
              onClick={() => showToast(text('欢迎发送您的宝贵反馈至 hanshutan110@gmail.com', 'Send your feedback to hanshutan110@gmail.com'))}
              className="flex items-center justify-between py-3.5 px-4 active:bg-gray-55/60 transition-colors cursor-pointer"
            >
              <div className="flex items-center space-x-3 text-slate-700">
                <HelpCircle size={18} className="text-[#4FACFE] stroke-[2.3]" />
                <span className="text-[16px] font-medium">{t('profile.item.feedback', '帮助与反馈')}</span>
              </div>
              <ChevronRight size={16} className="text-slate-300" />
            </div>
          </div>
        </div>

        {/* 5. Logout Button (Returns back to onboarding) */}
        <div className="text-center py-2 mb-4">
          <button 
            id="btn_logout_action"
            onClick={() => {
              onNavigate('login');
            }}
            className="text-[14px] font-bold text-slate-400 hover:text-red-400 active:scale-95 transition-all px-6 py-2.5 rounded-full"
          >
          {t('profile.btn_logout', '退出登录')}
        </button>
        </div>

      </div>

      {/* Bottom Nav Bar */}
      <BottomNavBar
        onNavigate={onNavigate}
        activeNavbarTab={activeNavbarTab}
        setActiveNavbarTab={setActiveNavbarTab}
      />

      {/* Overlay modal for Personal QR Code display */}
      {showQRModal && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-6 z-40">
          <div className="bg-white rounded-3xl w-full max-w-xs p-6 shadow-2xl flex flex-col items-center text-center space-y-4">
            
            {/* Modal close */}
            <div className="w-full flex justify-end">
              <button 
                onClick={() => setShowQRModal(false)}
                className="w-7 h-7 rounded-full bg-gray-100 text-gray-400 hover:text-gray-800 flex items-center justify-center font-bold active:bg-gray-200 text-xs"
              >
                ✕
              </button>
            </div>

            {/* Title inside */}
            <div className="text-center">
              <h3 className="text-[15px] font-black text-slate-800">{t('profile.qr_title', '轨迹工坊跑者名片')}</h3>
              <p className="text-[10px] text-slate-400 mt-1">{t('profile.qr_desc', '扫码一键添加跑友 / 跟踪他的轨迹作品')}</p>
            </div>

            {/* QR Card container */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-gray-100 relative">
              {/* Profile in miniature */}
              <div className="flex items-center space-x-2.5 pb-3 border-b border-gray-200/60 mb-3 text-left">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#4FACFE] to-[#00F2FE] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                  明
                </div>
                <div>
              <h4 className="text-[13px] font-bold text-slate-800">{profile?.displayName || t('profile.nickname', '跑者小明')}</h4>
              <p className="text-[9px] text-slate-400 mt-0.5 leading-none">{text(`累计跑量 ${stats.totalDistanceKm}km | ${profile?.badge || '新手跑者'}`, `Total ${stats.totalDistanceKm}km | ${profile?.badge || 'New Runner'}`)}</p>
                </div>
              </div>

              {/* Real QR graphic preview */}
              <div className="w-40 h-40 bg-white p-3 rounded-xl flex items-center justify-center shadow-inner relative overflow-hidden">
                <svg viewBox="0 0 100 100" className="w-full h-full text-slate-800">
                  {/* Visual matrix squares */}
                  <rect x="0" y="0" width="25" height="25" fill="currentColor" />
                  <rect x="5" y="5" width="15" height="15" fill="white" />
                  <rect x="9" y="9" width="7" height="7" fill="currentColor" />

                  <rect x="75" y="0" width="25" height="25" fill="currentColor" />
                  <rect x="80" y="5" width="15" height="15" fill="white" />
                  <rect x="84" y="9" width="7" height="7" fill="currentColor" />

                  <rect x="0" y="75" width="25" height="25" fill="currentColor" />
                  <rect x="5" y="80" width="15" height="15" fill="white" />
                  <rect x="9" y="84" width="7" height="7" fill="currentColor" />

                  {/* Random scattered pattern blobs representing complex QR matrix */}
                  <path d="M35,5 h5 v5 h-5 z M45,0 h10 v5 h-5 v10 h-5 z M60,5 h10 v5 h-10 z M35,20 h5 v10 h-5 z M50,25 h15 v5 h-15 z M70,25 h5 v5 h-5 z M80,30 h10 v10 h-10 z M15,35 h15 v5 h-15 z" fill="currentColor" />
                  <path d="M35,45 h10 v15 h-10 z M55,40 h15 v5 h-15 z M75,45 h10 v5 h-10 z M90,55 h10 v10 h-10 z M5,55 h10 v10 h-10 z M20,60 h10 v15 h-10 z M50,60 h10 v10 h-10 z M70,60 h20 v5 h-20 z" fill="currentColor" />
                  <path d="M35,80 h15 v15 h-15 z M60,80 h15 v5 h-15 z M80,80 h15 v15 h-15 z M90,70 h10 v10 h-10 z M55,90 h10 v10-10 z M75,90 h15 v10 h-15 z M5,30 h10 v10 h-10 z" fill="currentColor" />

                  {/* Central App icon logo inside QR */}
                  <rect x="38" y="38" width="24" height="24" fill="white" rx="4" />
                  <rect x="40" y="40" width="20" height="20" fill="url(#qrGradient)" rx="3" />
                  <defs>
                    <linearGradient id="qrGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#4FACFE" />
                      <stop offset="100%" stopColor="#00F2FE" />
                    </linearGradient>
                  </defs>
                  {/* Miniature runner */}
                  <path d="M47,44 A1.5,1.5 0 1,1 50,44 A1.5,1.5 0 1,1 47,44 M47,46.5 L49,49 L46,52 L51,55" fill="none" stroke="white" strokeWidth="1" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            <button
              onClick={() => showToast(text('跑者名片截图已保存至本地相册', 'Runner card screenshot saved to your photo library'))}
              className="w-full py-2.5 bg-gradient-to-r from-[#4FACFE] to-[#00F2FE] hover:brightness-105 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition-all shrink-0"
            >
              {t('profile.save_qr', '保存至系统相册')}
            </button>
          </div>
        </div>
      )}

    </div>
  );
};


/* ==========================================
   Screen 13: Settings Screen (设置页)
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
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const [showLanguageSheet, setShowLanguageSheet] = useState(false);
  const [showMapSheet, setShowMapSheet] = useState(false);
  const [showThicknessSheet, setShowThicknessSheet] = useState(false);

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
  }, [showToast, text]);

  const persistSettings = (patch: Partial<UserSettings>) => {
    updateUserSettings(patch)
      .then((nextProfile) => setProfile(nextProfile))
      .catch(() => showToast(text('设置保存失败，请稍后重试', 'Failed to save settings')));
  };

  const clearCacheAction = () => {
    if (cacheMemoryMB === 0) {
      showToast(text('缓存已被完全清空，无需二次清除', 'Cache has already been cleared'));
      return;
    }
    showToast(text('正在为您深度清扫文件及地图轨迹图缓存...', 'Clearing files and route cache...'));
    setTimeout(() => {
      setCacheMemoryMB(0);
      showToast(text('128MB 缓存数据清除成功！', '128 MB cache cleared successfully'));
    }, 1000);
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
        <div className="w-9"></div> {/* Balancer spacer */}
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
          {/* Active status */}
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

            {/* Setting 3: Voice broadcast switch iOS style */}
            <div className="h-[56px] px-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Volume2 size={18} className="text-[#4FACFE] stroke-[2.3]" />
                <span className="text-[15px] font-medium text-slate-700">{t('settings.voice', '语音播报')}</span>
              </div>
              
              {/* iOS Switch */}
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

            {/* Setting 4: Vibrate on deviation iOS style */}
            <div className="h-[56px] px-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Smartphone size={18} className="text-[#4FACFE] stroke-[2.3]" />
                <span className="text-[15px] font-medium text-slate-700">{t('settings.vibrate', '偏离时振动')}</span>
              </div>

              {/* iOS Switch */}
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

            {/* Setting 6: Traj lines thick sizing */}
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

            {/* Setting 9: Service protocol */}
            <div 
              onClick={() => showToast(text('用户协议已阅。您可通过账号注销及退出随时清除痕迹。', 'Terms reviewed. You can clear traces anytime by logging out or deleting your account.'))}
              className="h-[56px] px-4 flex items-center justify-between active:bg-slate-50 cursor-pointer transition-colors"
            >
              <div className="flex items-center space-x-3">
                <Lock size={18} className="text-[#4FACFE] stroke-[2.3]" />
                <span className="text-[15px] font-medium text-slate-700">{t('settings.privacy', '隐私政策')}</span>
              </div>
              <ChevronRight size={16} className="text-slate-300" />
            </div>

            {/* Setting 10: Privacy */}
            <div 
              onClick={() => showToast(text('服务协议说明。请规范在合法国画网格道路以及合法的户外路段运动', 'Service terms: please run on legal routes and public outdoor roads'))}
              className="h-[56px] px-4 flex items-center justify-between active:bg-slate-50 cursor-pointer transition-colors"
            >
              <div className="flex items-center space-x-3">
                <FileText size={18} className="text-[#4FACFE] stroke-[2.3]" />
                <span className="text-[15px] font-medium text-slate-700">{t('settings.service_protocol', '用户协议')}</span>
              </div>
              <ChevronRight size={16} className="text-slate-300" />
            </div>
          </div>
        </div>

        {/* 2. BOTTOM CACHE STATISTICS & RESET SYSTEM */}
        <div className="bg-gray-100 h-2.5"></div>
        <div className="flex flex-col items-center justify-center p-6 bg-white border-t border-gray-100">
            <span className="text-[12px] text-slate-400 font-mono">
            {t('settings.cache_value', '缓存')}：{cacheMemoryMB}MB
          </span>
          <button
            id="btn_clear_cache"
            onClick={clearCacheAction}
            className="text-[12.5px] font-extrabold text-[#4FACFE] mt-2 border border-[#4FACFE]/20 hover:bg-teal-50 px-5 py-2 rounded-full active:scale-95 transition-all outline-none"
          >
            {t('settings.clear_cache', '清除缓存')}
          </button>
        </div>

      </div>

      {/* Language Popup Choice Drawer Sheet */}
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

      {/* Map Choice Popup Drawer Sheet */}
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

      {/* Thickness Choice Popup Drawer Sheet */}
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

    </div>
  );
};
