import React, { useEffect, useState } from 'react';
import {
  CloudRain,
  MapPin,
  Cloud,
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
  const [activeSlide, setActiveSlide] = useState(1); // 0, 1, 2 representing cards
  const { t } = useI18n();

  return (
    <div className="flex flex-col min-h-full bg-linear-to-b from-[#4FACFE] to-[#00F2FE] text-white px-5 pt-5 pb-5 select-none justify-between relative overflow-hidden">
      
      {/* Decorative backdrop blobs */}
      <div className="absolute -top-12 -left-12 w-40 h-40 rounded-full bg-white/10 blur-xl pointer-events-none"></div>
      <div className="absolute top-1/2 -right-16 w-52 h-52 rounded-full bg-white/10 blur-2xl pointer-events-none"></div>

      {/* Top Header App Name */}
      <div className="text-center pt-4">
        <h2 className="text-xl font-extrabold tracking-widest text-white/90">{t('onboarding.title', '轨迹工坊 App')}</h2>
        <p className="text-[11px] text-white/70 mt-1 uppercase tracking-wider">{t('onboarding.subtitle', '用汗水在地图上作画')}</p>
      </div>

      {/* 3-Card Carousel Representation */}
      <div className="flex items-center justify-center my-auto relative h-[256px]">
        {/* Card 1: Left Card */}
        <div 
          onClick={() => setActiveSlide(0)}
          className={`absolute left-0 w-[84px] h-[164px] bg-white/15 backdrop-blur-md rounded-2xl p-3 flex flex-col justify-center items-center text-center transition-all duration-500 cursor-pointer ${
            activeSlide === 0 
              ? 'scale-110 z-20 bg-white/25 border-t border-white/20' 
              : 'scale-90 opacity-40 blur-[1px] translate-x-[-12px] z-10'
          }`}
        >
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white mb-2 shadow-xs">
            <Cloud size={18} />
          </div>
          <span className="text-[11px] font-bold block leading-tight">{t('onboarding.step1_title', '1. 上传图片')}</span>
          <span className="text-[8px] text-white/70 leading-none mt-1">{t('onboarding.step1_desc', '任意图片转换')}</span>
        </div>

        {/* Card 2: Center Card */}
        <div 
          onClick={() => setActiveSlide(1)}
          className={`absolute w-[184px] h-[212px] bg-white/20 backdrop-blur-xl rounded-[24px] p-5 flex flex-col justify-center items-center text-center transition-all duration-500 border border-white/30 shadow-xl cursor-pointer ${
            activeSlide === 1 
              ? 'scale-105 z-30 translate-x-0 bg-white/25' 
              : activeSlide === 0 
                ? 'translate-x-[64px] scale-90 opacity-50 blur-[2px] z-10' 
                : 'translate-x-[-64px] scale-90 opacity-50 blur-[2px] z-10'
          }`}
        >
          <div className="w-14 h-14 rounded-full bg-linear-to-tr from-white to-blue-50 flex items-center justify-center text-[#4FACFE] mb-4 shadow-lg">
            <CloudRain size={26} className="text-[#4FACFE]" />
          </div>
          <h3 className="text-[17px] font-extrabold tracking-tight">{t('onboarding.step2_title', '2. 生成轨迹')}</h3>
          <p className="text-[11px] text-white/80 mt-2.5 leading-normal select-none">
            {t('onboarding.step2_desc1', 'AI 智能提取运动路径，')}
            <br />
            {t('onboarding.step2_desc2', '或点击手动描边绘制。')}
          </p>
        </div>

        {/* Card 3: Right Card */}
        <div 
          onClick={() => setActiveSlide(2)}
          className={`absolute right-0 w-[84px] h-[164px] bg-white/15 backdrop-blur-md rounded-2xl p-3 flex flex-col justify-center items-center text-center transition-all duration-500 cursor-pointer ${
            activeSlide === 2 
              ? 'scale-110 z-20 bg-white/25 border-t border-white/20' 
              : 'scale-90 opacity-40 blur-[1px] translate-x-[12px] z-10'
          }`}
        >
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white mb-2 shadow-xs">
            <MapPin size={18} />
          </div>
          <span className="text-[11px] font-bold block leading-tight">{t('onboarding.step3_title', '3. 跟着跑！')}</span>
          <span className="text-[8px] text-white/70 leading-none mt-1">{t('onboarding.step3_desc', '语音偏差实时指流')}</span>
        </div>
      </div>

      {/* Carousel dots */}
      <div className="flex justify-center space-x-1.5 mb-2">
        {[0, 1, 2].map((slideIdx) => (
          <button
            key={slideIdx}
            onClick={() => setActiveSlide(slideIdx)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              activeSlide === slideIdx ? 'w-4.5 bg-white' : 'w-1.5 bg-white/40'
            }`}
          ></button>
        ))}
      </div>

      {/* Action triggers */}
      <div className="flex flex-col space-y-4 mb-3">
        {/* Big Start button */}
        <button
          onClick={() => onNavigate('home')}
          className="w-full py-3.5 bg-white text-gray-800 hover:bg-opacity-95 font-black text-sm tracking-widest rounded-full shadow-lg shadow-[#00F2FE]/20 active:scale-98 transition-all"
        >
          {t('onboarding.cta', '开始体验')}
        </button>

        {/* Footnotes */}
        <button 
          onClick={() => onNavigate('login')} 
          className="text-center text-[12px] text-white/70 hover:text-white transition-colors"
        >
          {t('onboarding.has_account', '已有账号？')}<span className="underline font-bold">{t('onboarding.login', '登录')}</span>
        </button>
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
