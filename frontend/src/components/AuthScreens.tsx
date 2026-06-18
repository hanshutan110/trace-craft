import React, { useEffect, useState } from 'react';
import {
  Activity,
  Route,
  Timer,
} from 'lucide-react';
import { ScreenId } from '../types';
import { useI18n } from '../i18n';
import { useToast } from './common/Toast';
import { phoneLogin, quickLogin, type QuickLoginProvider } from '../api/auth';
import { getPublicContent, type PublicContentItem } from '../api/content';

/* ==========================================
   Screen 5: Onboarding Screen (首次使用引导页)
   ========================================== */
interface OnboardingScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onNavigate }) => {
  const { t } = useI18n();
  const features = [
    {
      icon: Route,
      title: t('实时轨迹', 'Live route'),
      desc: t('边跑边校准方向', 'Adjust direction while running'),
      tone: 'text-cyan-600 bg-cyan-50 border-cyan-100',
    },
    {
      icon: Activity,
      title: t('运动数据', 'Run metrics'),
      desc: t('距离、时间、配速清晰记录', 'Distance, time, pace tracked clearly'),
      tone: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    },
    {
      icon: Timer,
      title: t('路线回顾', 'Route replay'),
      desc: t('复盘每一次轨迹表现', 'Review every route performance'),
      tone: 'text-amber-600 bg-amber-50 border-amber-100',
    },
  ];

  return (
    <div className="w-full max-w-full h-full min-h-[100dvh] bg-[#f8fbf7] flex flex-col text-slate-950 select-none relative overflow-hidden">
      <div className="h-[42%] min-h-[330px] bg-linear-to-br from-[#38bdf8] via-[#16c7d8] to-[#09e5df] text-white relative flex flex-col items-center justify-center px-6 pb-7 overflow-hidden">
        <svg className="absolute inset-0 w-full h-full opacity-25" viewBox="0 0 430 390" fill="none" preserveAspectRatio="none" aria-hidden="true">
          <path d="M-20 302 C 65 230, 102 328, 166 247 S 274 139, 452 188" stroke="white" strokeWidth="2" strokeDasharray="8 14" strokeLinecap="round" />
          <path d="M-35 92 C 42 145, 101 77, 178 124 S 305 208, 466 76" stroke="white" strokeWidth="1.6" strokeDasharray="5 12" strokeLinecap="round" />
          <circle cx="75" cy="268" r="5" fill="white" />
          <circle cx="320" cy="158" r="4" fill="#f59e0b" />
        </svg>
        <div className="absolute inset-x-0 bottom-0 h-20 bg-linear-to-t from-[#f8fbf7] to-transparent opacity-30 pointer-events-none"></div>

        <div className="relative z-10 w-[92px] h-[92px] bg-white rounded-full flex items-center justify-center shadow-xl shadow-cyan-700/20 mb-6 active:scale-95 transition-transform">
          <svg className="w-14 h-14 text-cyan-500" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 10.2l-.3 1.5C6.4 13 8 14 9.5 14l1.3-.2-.5 2.5-3.8.8c-.3.1-.5.4-.5.7 0 .4.4.7.8.7l4.5-.9c.4-.1.7-.4.8-.8l.8-4.2c.1-.4-.1-.8-.5-.9l-3.3-1zM19.4 8.1c-.2-.4-.5-.6-1-.5l-3.9.7c-.4.1-.7.4-.8.8l-.8 4.2c0 .2.1.4.3.5.2.1.4.1.5-.1l.9-1.9 1.5 2.5c.2.3.5.5.9.5h2.5c.3 0 .5-.2.5-.5s-.2-.5-.5-.5H17.4l-1.3-2.1 1.7-2.1 1.6.4c.1 0 .2 0 .3-.1l1.5-1.1c.2-.2.3-.5.1-.7l-.2-.2z" />
          </svg>
        </div>
        <h1 className="relative z-10 text-[29px] font-black tracking-tight drop-shadow-md">{t('轨迹运动', 'Trace Run')}</h1>
        <p className="relative z-10 text-[14px] text-white/85 font-semibold tracking-[0.08em] mt-2">{t('让每一次运动更清晰', 'Make every run clearer')}</p>
        <div className="relative z-10 flex items-center gap-1.5 mt-8 h-4" aria-hidden="true">
          <span className="w-2 h-2 rounded-full bg-white/45"></span>
          <span className="w-2 h-2 rounded-full bg-white/45"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-white"></span>
        </div>
      </div>

      <div className="w-full max-w-full min-w-0 flex-1 min-h-0 overflow-x-hidden overflow-y-auto scrollbar-none flex flex-col justify-between px-5 pt-5 pb-[calc(20px+env(safe-area-inset-bottom))]">
        <div className="w-full max-w-[390px] mx-auto space-y-4 shrink-0">
          <div className="w-full max-w-full min-w-0 overflow-hidden rounded-[24px] bg-white border border-slate-100 shadow-[0_18px_42px_rgba(15,23,42,0.08)] p-4">
            <div className="flex items-center justify-between gap-3 mb-3 min-w-0">
              <div className="min-w-0">
                <p className="text-[11px] font-black text-cyan-600 tracking-[0.14em] uppercase">TraceCraft</p>
                <h2 className="text-[18px] font-black text-slate-950 mt-0.5 leading-tight">{t('今天的轨迹预览', 'Today route preview')}</h2>
              </div>
              <span className="shrink-0 px-2 py-1 rounded-full bg-amber-50 text-amber-700 text-[10px] font-extrabold border border-amber-100">
                {t('智能分析', 'Smart')}
              </span>
            </div>

            <div className="h-[92px] rounded-[18px] bg-[#eef9f7] border border-cyan-100/70 relative overflow-hidden">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(14,165,233,0.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(14,165,233,0.12)_1px,transparent_1px)] bg-[size:18px_18px]"></div>
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 330 92" fill="none" preserveAspectRatio="none" aria-hidden="true">
                <path d="M32 68 C 75 14, 110 82, 154 40 S 228 19, 297 58" stroke="#0891b2" strokeWidth="5" strokeLinecap="round" />
                <path d="M32 68 C 75 14, 110 82, 154 40 S 228 19, 297 58" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 12" />
                <circle cx="32" cy="68" r="7" fill="#10b981" stroke="white" strokeWidth="3" />
                <circle cx="297" cy="58" r="7" fill="#f59e0b" stroke="white" strokeWidth="3" />
              </svg>
            </div>

            <div className="grid grid-cols-3 divide-x divide-slate-100 pt-3 text-center">
              <div>
                <span className="text-[18px] font-black font-mono text-slate-950">3.2</span>
                <p className="text-[10px] font-semibold text-slate-500 mt-0.5">km</p>
              </div>
              <div>
                <span className="text-[18px] font-black font-mono text-slate-950">21:18</span>
                <p className="text-[10px] font-semibold text-slate-500 mt-0.5">{t('时间', 'Time')}</p>
              </div>
              <div>
                <span className="text-[18px] font-black font-mono text-slate-950">5'58"</span>
                <p className="text-[10px] font-semibold text-slate-500 mt-0.5">{t('配速', 'Pace')}</p>
              </div>
            </div>
          </div>

          <div className="w-full max-w-full min-w-0 grid grid-cols-3 gap-2 overflow-hidden">
            {features.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="min-w-0 min-h-[92px] rounded-[18px] bg-white border border-slate-100 p-3 shadow-[0_10px_26px_rgba(15,23,42,0.04)] overflow-hidden">
                  <div className={`w-9 h-9 rounded-full border flex items-center justify-center ${item.tone}`}>
                    <Icon size={17} strokeWidth={2.4} aria-hidden="true" />
                  </div>
                  <h3 className="text-[12px] font-black text-slate-950 mt-2 leading-tight break-words">{item.title}</h3>
                  <p className="text-[9px] leading-snug text-slate-500 mt-1 break-words">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="w-full max-w-[390px] mx-auto space-y-3 pt-4 shrink-0">
          <button
            onClick={() => onNavigate('home')}
            className="w-full min-h-[48px] bg-slate-950 text-white font-black text-sm rounded-full shadow-lg shadow-[0_14px_30px_rgba(15,23,42,0.18)] hover:bg-slate-800 active:scale-[0.98] transition-all text-center tracking-[0.08em]"
          >
            {t('继续开始体验', 'Continue')}
          </button>
          <button
            onClick={() => onNavigate('login')}
            className="w-full text-center text-[12px] text-slate-500 hover:text-slate-800 transition-colors"
          >
            {t('onboarding.has_account', '已有账号？')}<span className="font-bold underline underline-offset-4">{t('onboarding.login', '登录')}</span>
          </button>
          <p className="text-center text-[10px] text-slate-400 tracking-[0.08em]">
            {t('TrackCraft 2026 运动路线智能分析', 'TrackCraft 2026 intelligent route analysis')}
          </p>
        </div>
      </div>
    </div>
  );
};


/* ==========================================
   Screen 11: Login/Register Screen (注册登录页)
   ========================================== */
interface LoginScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onNavigate }) => {
  const { t, text } = useI18n();
  const { showToast } = useToast();
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showDocModal, setShowDocModal] = useState<'privacy' | 'agreement' | null>(null);
  const [docContent, setDocContent] = useState<PublicContentItem | null>(null);
  const [docLoading, setDocLoading] = useState(false);

  useEffect(() => {
    if (!showDocModal) {
      setDocContent(null);
      return;
    }
    let cancelled = false;
    setDocLoading(true);
    getPublicContent('policy', showDocModal)
      .then((content) => {
        if (!cancelled) setDocContent(content);
      })
      .catch(() => {
        if (!cancelled) setDocContent(null);
      })
      .finally(() => {
        if (!cancelled) setDocLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showDocModal]);

  const handleThirdPartyLogin = async (platform: QuickLoginProvider) => {
    setIsLoggingIn(true);
    showToast(
      platform === 'wechat'
        ? text('正在拉起微信协议授权...', 'Opening WeChat authorization...')
        : text('正在拉起支付宝协议授权...', 'Opening Alipay authorization...'),
    );
    try {
      const auth = await quickLogin(platform);
      setIsLoggingIn(false);
      showToast(auth.isNewUser
        ? text('快捷注册成功，已为您登录！', 'Quick registration complete. You are logged in.')
        : text('授权成功，已为您登录！', 'Authorization successful. You are logged in.'));
      setTimeout(() => {
        onNavigate('profile');
      }, 500);
    } catch {
      setIsLoggingIn(false);
      showToast(text('快捷登录失败，请稍后重试', 'Quick login failed. Try again later.'));
    }
  };

  const sendSMS = () => {
    if (!phoneNumber || phoneNumber.length < 11) {
      showToast(text('请输入合法的11位手机号', 'Enter a valid 11-digit mobile number'));
      return;
    }
    setIsSendingCode(true);
    showToast(text('验证码发送中...', 'Sending verification code...'));
    setTimeout(() => {
      setIsSendingCode(false);
      setCodeSent(true);
      setSmsCode('8888');
      showToast(text('验证码[8888]已发送', 'Code [8888] sent'));
    }, 1000);
  };

  const handlePhoneLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber || phoneNumber.length < 11) {
      showToast(text('请输入合法的11位手机号', 'Enter a valid 11-digit mobile number'));
      return;
    }
    if (!smsCode) {
      showToast(text('请输入验证码', 'Enter the verification code'));
      return;
    }
    setIsLoggingIn(true);
    setShowPhoneModal(false);
    showToast(text('正在验证手机/短信授权...', 'Verifying phone/SMS authorization...'));
    try {
      const auth = await phoneLogin(phoneNumber, smsCode);
      setIsLoggingIn(false);
      showToast(auth.isNewUser
        ? text('手机号注册成功，已为您登录！', 'Phone registration complete. You are logged in.')
        : text('登录成功，欢迎回来！', 'Login successful, welcome back!'));
      setTimeout(() => {
        onNavigate('profile');
      }, 500);
    } catch {
      setIsLoggingIn(false);
      showToast(text('手机号登录失败，请检查验证码', 'Phone login failed. Check the code.'));
    }
  };

  return (
    <div className="flex flex-col h-full bg-white text-slate-850 p-5 select-none justify-between relative overflow-hidden">

      {/* Top Section */}
      <div className="flex flex-col items-center pt-8">
        {/* App Logo */}
        <div className="w-[80px] h-[80px] rounded-full bg-gradient-to-tr from-[#4FACFE] to-[#00F2FE] flex items-center justify-center shadow-lg shadow-[#4FACFE]/25 mb-4 animate-pulse">
          {/* Running person icon white */}
          <svg viewBox="0 0 24 24" className="w-10 h-10 text-white fill-none stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" fill="currentColor"/>
            <path d="M14 9.5 12 11l-3-2.5-3.5 2"/>
            <path d="M12 11v4l-2.5 3L7 16"/>
            <path d="M12 15l1.5 2.5 3.5-1M13 5.5l.5 4"/>
          </svg>
        </div>

        {/* App Title */}
        <h1 className="text-[28px] font-black tracking-tight text-slate-800 leading-none">{t('app.title', '轨迹工坊')}</h1>
        {/* Slogan */}
        <p className="text-[14px] text-slate-400 mt-2 font-medium">{t('auth.brand_subtitle', '跑出你的专属形状')}</p>
      </div>

      {/* Central Illustration Region (Star Trail Run) */}
      <div className="w-full h-36 flex items-center justify-center my-1 relative">
        <svg viewBox="0 0 200 120" className="w-full h-full max-w-[240px] drop-shadow-sm">
          <defs>
            <linearGradient id="trailLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4FACFE" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#00F2FE" stopOpacity="0.8" />
            </linearGradient>
            <filter id="shadowGlow" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Guidelines matching client request */}
          <line x1="10" y1="95" x2="190" y2="95" stroke="#F1F5F9" strokeWidth="1.5" strokeDasharray="3 3" />
          <line x1="35" y1="20" x2="35" y2="95" stroke="#F1F5F9" strokeWidth="1.5" strokeDasharray="3 3" />
          <line x1="165" y1="20" x2="165" y2="95" stroke="#F1F5F9" strokeWidth="1.5" strokeDasharray="3 3" />

          {/* Curved path */}
          <path d="M25,85 C65,25 110,105 155,50" fill="none" stroke="url(#trailLogoGrad)" strokeWidth="5.5" strokeLinecap="round" />

          {/* Yellow/Teal Glowing star trails */}
          <polygon points="25,85 27,89 31,89 28,92 29,96 25,94 21,96 22,92 19,89 23,89" fill="#4FACFE" className="opacity-40" />
          <polygon points="85,60 88,65 93,65 89,69 91,74 85,71 79,74 81,69 77,65 82,65" fill="#00F2FE" className="opacity-75 animate-pulse" />
          <polygon points="152,50 156,57 164,58 158,65 160,73 152,69 144,73 146,65 140,58 148,57" fill="#00F2FE" filter="url(#shadowGlow)" className="animate-pulse" />

          {/* Running athlete figure outline */}
          <g transform="translate(138, 12)" className="animate-bounce" style={{ animationDuration: '3s' }}>
            <circle cx="20" cy="10" r="4.5" fill="#4FACFE" />
            <path d="M19,15 C20,15 22,17 21,28 C21,29 18,34 16,33" stroke="#00F2FE" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M21,15 L14,19 L9,17" stroke="#4FACFE" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <path d="M21,15 L27,19 L30,23" stroke="#00F2FE" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            {/* Legs */}
            <path d="M19,26 L12,34 L17,39" stroke="#4FACFE" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M21,26 L26,32 L20,38" stroke="#00F2FE" strokeWidth="3" strokeLinecap="round" fill="none" />
          </g>

          <circle cx="70" cy="30" r="1.5" fill="#4FACFE" className="animate-ping" style={{ animationDuration: '2.5s' }} />
          <circle cx="115" cy="80" r="1" fill="#00F2FE" className="animate-pulse" />
        </svg>
      </div>

      {/* Buttons Area */}
      <div className="flex flex-col items-center space-y-3 px-1">
        {/* Wechat Login */}
        <button 
          id="btn_wechat_login"
          onClick={() => void handleThirdPartyLogin('wechat')}
          className="w-[85%] h-[52px] bg-white rounded-[32px] shadow-[0_5px_15px_rgba(0,0,0,0.06)] hover:shadow-md border border-gray-100 flex items-center px-6 active:scale-[0.98] transition-all cursor-pointer justify-center relative overflow-hidden group"
        >
          {/* Inner slick highlight */}
          <div className="absolute inset-x-0 top-0 h-[1px] bg-white/50"></div>
          {/* Green WeChat Icon */}
          <div className="absolute left-6 text-[#07C160]">
            <svg viewBox="0 0 24 24" className="w-[20px] h-[20px]" fill="currentColor">
              <path d="M8.5,13.5c-.3,0-.5-.2-.5-.5s.2-.5.5-.5.5.2.5.5-.2.5-.5.5zm4.5,0c-.3,0-.5-.2-.5-.5s.2-.5.5-.5.5.2.5.5-.2.5-.5.5zm.8,4c2.8,0,5.2-1.7,5.2-3.8c0-2.1-2.4-3.8-5.2-3.8c-2.9,0-5.3,1.7-5.3,3.8c0,2.1,2.4,3.8,5.3,3.8zm-5.3-7c2.2,0,4-1.5,4-3.5c0-1.9-1.8-3.5-4-3.5c-2.3,0-4.1,1.6-4.1,3.5c0,2,1.8,3.5,4.1,3.5zm-2-5c.3,0,.5.2.5.5s-.2.5-.5.5-.5-.2-.5-.5.2-.5.5-.5zm2.8,0c.3,0,.5.2.5.5s-.2.5-.5.5-.5-.2-.5-.5.2-.5.5-.5z" />
            </svg>
          </div>
          <span className="text-[16px] font-bold text-slate-700">{t('auth.wechat_login', '微信一键登录')}</span>
        </button>

        {/* Alipay Login */}
        <button 
          id="btn_alipay_login"
          onClick={() => void handleThirdPartyLogin('alipay')}
          className="w-[85%] h-[52px] bg-white rounded-[32px] shadow-[0_5px_15px_rgba(0,0,0,0.06)] hover:shadow-md border border-gray-100 flex items-center px-6 active:scale-[0.98] transition-all cursor-pointer justify-center relative group"
        >
          <div className="absolute left-6 text-[#1677FF] font-semibold">
            <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="currentColor">
              <path d="M12 2.5a9.5 9.5 0 1 0 0 19 9.5 9.5 0 0 0 0-19Zm4.9 13.8c-1.5-.5-2.9-1.1-4.1-1.8-1.1 1.3-2.5 2.1-4.2 2.1-1.5 0-2.6-.8-2.6-2 0-1.4 1.4-2.2 3.3-2.2.9 0 1.8.2 2.7.5.3-.6.6-1.3.8-2.1H7.2V9.3h3.3V8.1H6.6V6.6h3.9V5.1h1.7v1.5h4v1.5h-4v1.2h3.3v1.3c-.3 1.1-.7 2.1-1.2 3 1 .5 2.2 1 3.5 1.3l-.9 1.4Zm-7.7-1.1c1 0 1.8-.5 2.5-1.4-.8-.3-1.5-.4-2.2-.4-1 0-1.6.4-1.6 1 0 .5.5.8 1.3.8Z"/>
            </svg>
          </div>
          <span className="text-[16px] font-bold text-slate-700">{t('auth.alipay_login', '支付宝一键登录')}</span>
        </button>

        {/* Divider */}
        <div className="w-[80%] flex items-center justify-between py-2">
          <div className="flex-1 h-[0.5px] bg-slate-200"></div>
          <span className="text-[12px] text-slate-400 px-3 font-medium">{t('auth.or', '或')}</span>
          <div className="flex-1 h-[0.5px] bg-slate-200"></div>
        </div>

        {/* Alternate login route */}
        <button 
          id="btn_phone_login"
          onClick={() => setShowPhoneModal(true)}
          className="text-[14px] font-bold bg-gradient-to-r from-[#4FACFE] to-[#00F2FE] bg-clip-text text-transparent active:opacity-70 transition-all cursor-pointer"
        >
          {t('auth.phone_login', '手机号登录')}
        </button>
      </div>

      {/* Terms & Protocols */}
      <div className="text-center pb-6 px-4">
        <p className="text-[10px] text-slate-400 inline">
          {t('auth.login_agree_prefix', '登录即表示同意')}
        </p>
        <button 
          onClick={() => setShowDocModal('agreement')}
          className="text-[10px] font-bold text-[#4FACFE] hover:underline px-0.5"
        >
          {t('auth.user_agreement', '《用户协议》')}
        </button>
        <p className="text-[10px] text-slate-400 inline">{t('auth.and', '和')}</p>
        <button 
          onClick={() => setShowDocModal('privacy')}
          className="text-[10px] font-bold text-[#4FACFE] hover:underline px-0.5"
        >
          {t('auth.privacy_policy', '《隐私政策》')}
        </button>
      </div>

      {/* Loading Overlay */}
      {isLoggingIn && (
        <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex items-center justify-center z-50">
          <div className="bg-slate-900 text-white rounded-2xl p-5 flex flex-col items-center justify-center space-y-3 shadow-xl">
            <div className="w-10 h-10 border-4 border-t-[#00F2FE] border-[#4FACFE]/20 rounded-full animate-spin"></div>
            <span className="text-xs font-semibold">{t('auth.logging_in', '正在登录您的轨迹工坊...')}</span>
          </div>
        </div>
      )}

      {/* PORT 1: SMS Phone login popup modal */}
      {showPhoneModal && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-end justify-center z-40 animate-fade-in">
          <div className="w-full bg-white rounded-t-[32px] p-6 shadow-2xl flex flex-col space-y-4 bottom-0 animate-slide-up max-h-[75%] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h3 className="text-base font-bold text-slate-800">{t('auth.phone_login_title', '手机号快捷登录')}</h3>
              <button 
                onClick={() => setShowPhoneModal(false)}
                className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-slate-500 font-bold active:bg-gray-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePhoneLoginSubmit} className="space-y-4 pt-2">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase">{t('auth.phone_label', '中国大陆手机号 (+86)')}</label>
                <div className="flex items-center border border-gray-200 rounded-xl px-3 py-2.5 bg-gray-50 focus-within:border-[#4FACFE] focus-within:bg-white transition-colors">
                  <span className="text-[14px] text-slate-500 mr-2 font-bold font-mono">+86</span>
                  <input
                    type="tel"
                    maxLength={11}
                    placeholder={t('auth.phone_placeholder', '请输入11位手机号码')}
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                    className="flex-1 bg-transparent border-none outline-none text-[14px] font-mono text-slate-800 placeholder-slate-400"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase">{t('auth.sms_label', '短信验证码')}</label>
                <div className="flex items-center justify-between space-x-2">
                  <div className="flex-1 flex items-center border border-gray-200 rounded-xl px-3 py-2.5 bg-gray-50 focus-within:border-[#4FACFE] focus-within:bg-white transition-colors">
                    <input
                      type="text"
                      maxLength={6}
                      placeholder={t('auth.sms_placeholder', '验证码')}
                      value={smsCode}
                      onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-transparent border-none outline-none text-[14px] font-mono text-slate-800 placeholder-slate-400"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={sendSMS}
                    disabled={isSendingCode}
                    className="px-4 py-2.5 bg-slate-100 active:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 border border-slate-200 hover:border-slate-300 disabled:opacity-50 transition-all shrink-0"
                  >
                    {isSendingCode ? t('auth.sending', '发送中') : codeSent ? t('auth.reget_code', '重新获取') : t('auth.get_code', '获取验证码')}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={!phoneNumber || !smsCode}
                className="w-full py-3.5 bg-gradient-to-r from-[#4FACFE] to-[#00F2FE] hover:brightness-105 active:scale-[0.99] rounded-[24px] text-white font-bold text-sm tracking-wider shadow-lg shadow-[#4FACFE]/25 disabled:opacity-50 transition-all text-center mt-3"
              >
                {t('auth.submit_phone_login', '授权并绑定登录（测试直通）')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* PORT 2: Agreement or Privacy modals */}
      {showDocModal && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-5 z-40">
          <div className="bg-white rounded-3xl w-full max-w-xs p-5 shadow-2xl flex flex-col space-y-4 max-h-[80%]">
            <h3 className="text-base font-extrabold text-slate-800 border-b pb-2">
              {docContent?.title || (showDocModal === 'privacy' ? t('auth.privacy_title', '轨迹工坊隐私政策说明') : t('auth.agreement_title', '轨迹工坊用户服务协议'))}
            </h3>
            
            <div className="text-[12px] text-slate-500 overflow-y-auto max-h-56 space-y-2 leading-relaxed">
              {docLoading ? (
                <p>{text('内容加载中...', 'Loading...')}</p>
              ) : docContent ? (
                <>
                  <p className="font-bold text-slate-700">{docContent.summary || t('auth.updated_at', '更新日期：2026年6月9日')}</p>
                  {docContent.body.split(/\n{2,}/).map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </>
              ) : (
                <>
                  <p className="font-bold text-slate-700">{t('auth.updated_at', '更新日期：2026年6月9日')}</p>
                  <p>{t('auth.doc_p1', '欢迎阁下使用"轨迹工坊"运动绘图寻航应用软件！')}</p>
                  <p>{t('auth.doc_p2', '为了保障您的合法合法权益，请务必仔细阅读本文件。我们深度关注您的个人信息和隐私数据保护：')}</p>
                  <p>{t('auth.doc_p3', '1. 我们仅在您使用"手动描边(4)"或"图片寻回(9)"以及位置跟踪时访问您的地理坐标，且采用最严格的脱敏算法保密，坚决不上送任何社交无关机密。')}</p>
                  <p>{t('auth.doc_p4', '2. 账号绑定基于微信/支付宝官方授权流程，提供一键免密码注册，不采集不索要明文账户密码。')}</p>
                  <p>{t('auth.doc_p5', '3. 您有随时清除本地生成图片缓存(13)以及彻底注销本人账号权利。')}</p>
                </>
              )}
            </div>

            <button
              onClick={() => setShowDocModal(null)}
              className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs text-center transition-colors"
            >
          {t('auth.doc_agree', '已阅并同意')}
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
