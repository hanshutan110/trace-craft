/**
 * ProfileScreen - 个人中心页
 *
 * 从原 ProfileAndSettings.tsx 拆分而来。
 * 功能：展示用户个人信息卡片、运动数据统计面板、功能列表入口（我的轨迹/历史记录/收藏模板/设置/关于/反馈），
 *       包含头像上传、编辑资料弹窗、反馈提交弹窗、二维码名片弹窗以及退出登录操作。
 *
 * @source 拆分自 components/ProfileAndSettings.tsx (SCREEN 12)
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Heart,
  Clock,
  Settings,
  QrCode,
  Camera,
  HelpCircle,
  Info,
  ChevronRight,
  Image as ImageIcon,
} from 'lucide-react';
import { ScreenId } from '../../types';
import { useI18n } from '../../i18n';
import { useToast } from '../common/Toast';
import { BottomNavBar } from '../common/BottomNavBar';
import { logout } from '../../api/auth';
import { createUserQrCard, getCurrentUserProfile, submitUserFeedback, updateUserProfile, uploadUserAsset, type UserProfile } from '../../api/user';
import { assetUrl } from './profile-settings-utils';

/* ==========================================
   Profile Center Screen (个人中心页)
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
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showProfileEditModal, setShowProfileEditModal] = useState(false);
  const [qrSaving, setQrSaving] = useState(false);
  const [profileNameDraft, setProfileNameDraft] = useState('');
  const [profileSignatureDraft, setProfileSignatureDraft] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [feedbackContent, setFeedbackContent] = useState('');
  const [feedbackContact, setFeedbackContact] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

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

  async function handleAvatarFile(file: File | undefined): Promise<void> {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast(text('请选择图片文件', 'Choose an image file'));
      return;
    }
    setAvatarUploading(true);
    try {
      const result = await uploadUserAsset(file, 'avatar');
      if (result.profile) setProfile(result.profile as UserProfile);
      showToast(text('头像已更新', 'Avatar updated'));
    } catch {
      showToast(text('头像上传失败，请稍后重试', 'Avatar upload failed. Try again later.'));
    } finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  }

  async function handleSubmitFeedback(): Promise<void> {
    const content = feedbackContent.trim();
    if (content.length < 3) {
      showToast(text('请填写反馈内容', 'Please enter feedback'));
      return;
    }
    setFeedbackSubmitting(true);
    try {
      await submitUserFeedback({
        content,
        contact: feedbackContact.trim(),
        category: 'general',
      });
      setFeedbackContent('');
      setFeedbackContact('');
      setShowFeedbackModal(false);
      showToast(text('反馈已提交', 'Feedback submitted'));
    } catch {
      showToast(text('反馈提交失败，请稍后重试', 'Feedback failed. Try again later.'));
    } finally {
      setFeedbackSubmitting(false);
    }
  }

  function openProfileEdit(): void {
    setProfileNameDraft(profile?.displayName || '');
    setProfileSignatureDraft(profile?.signature || '');
    setShowProfileEditModal(true);
  }

  async function handleSaveProfile(): Promise<void> {
    const displayName = profileNameDraft.trim();
    const signature = profileSignatureDraft.trim();
    if (!displayName || !signature) {
      showToast(text('昵称和签名不能为空', 'Name and signature are required'));
      return;
    }
    setProfileSaving(true);
    try {
      const nextProfile = await updateUserProfile({ displayName, signature });
      setProfile(nextProfile);
      setShowProfileEditModal(false);
      showToast(text('个人资料已更新', 'Profile updated'));
    } catch {
      showToast(text('个人资料保存失败，请稍后重试', 'Profile update failed. Try again later.'));
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleSaveQrCard(): Promise<void> {
    setQrSaving(true);
    try {
      const asset = await createUserQrCard();
      const link = document.createElement('a');
      link.href = assetUrl(String(asset.url || ''));
      link.download = 'tracecraft-runner-card.webp';
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast(text('跑者名片已生成并开始下载', 'Runner card generated and downloading'));
    } catch {
      showToast(text('跑者名片生成失败，请稍后重试', 'Runner card generation failed. Try again later.'));
    } finally {
      setQrSaving(false);
    }
  }

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
                onClick={() => avatarInputRef.current?.click()}
                className="w-16 h-16 rounded-full bg-slate-100 border-2 border-slate-200/60 relative cursor-pointer group-hover:border-[#00F2FE]/50 transition-colors flex items-center justify-center shrink-0 overflow-hidden"
              >
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(event) => void handleAvatarFile(event.target.files?.[0])}
                />
                {profile?.avatarUrl ? (
                  <img src={assetUrl(profile.avatarUrl)} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-2xl">🏃‍♂️</span>
                )}
                {avatarUploading && (
                  <div className="absolute inset-0 bg-slate-900/45 text-[10px] font-bold text-white flex items-center justify-center">
                    {text('上传中', 'Uploading')}
                  </div>
                )}
                
                {/* Mini Edit Camera overlay */}
                <div className="absolute bottom-0 right-0 w-5 h-5 bg-gradient-to-r from-[#4FACFE] to-[#00F2FE] text-white rounded-full flex items-center justify-center border border-white shrink-0">
                  <Camera size={10} className="stroke-[2.5]" />
                </div>
              </div>

              {/* Text Info */}
              <div>
                <h3 className="text-[18px] font-black text-slate-800 flex items-center gap-1">
                <button onClick={openProfileEdit} className="text-left hover:text-[#4FACFE] transition-colors">
                  {profile?.displayName || t('profile.nickname', '跑者小明')}
                </button>
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
            <button className="text-[#00F2FE]/90 font-bold hover:underline cursor-pointer" onClick={openProfileEdit}>{t('profile.edit', '修改')}</button>
          </div>
        </div>

        {/* 2. Stats Counters Tri-column */}
        <div className="px-4 grid grid-cols-3 gap-3 mb-6">
          <div 
            onClick={() => showToast(text(`累计跑步 ${stats.totalDistanceKm} 公里`, `Total distance ${stats.totalDistanceKm} km`))}
            className="bg-white rounded-[16px] p-3.5 border border-gray-100 shadow-[0_4px_12px_rgba(0,0,0,0.02)] text-center flex flex-col justify-center active:scale-98 transition-all hover:border-[#4FACFE]/10 cursor-pointer"
          >
            <span className="text-[20px] font-extrabold text-slate-800 leading-tight">{stats.totalDistanceKm}</span>
            <span className="text-[11px] text-slate-400 mt-1">{t('profile.stats_distance', '总距离 (km)')}</span>
          </div>

          <div 
            onClick={() => showToast(text(`累计运动 ${stats.totalDurationHours} 小时`, `Total duration ${stats.totalDurationHours} hours`))}
            className="bg-white rounded-[16px] p-3.5 border border-gray-100 shadow-[0_4px_12px_rgba(0,0,0,0.02)] text-center flex flex-col justify-center active:scale-98 transition-all hover:border-[#4FACFE]/10 cursor-pointer"
          >
            <span className="text-[20px] font-extrabold text-slate-800 leading-tight">{stats.totalDurationHours}</span>
            <span className="text-[11px] text-slate-400 mt-1">{t('profile.stats_time', '总时长 (时)')}</span>
          </div>

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

        {/* 4. Function List group 2: 其他 */}
        <div className="mb-6">
          <h4 className="text-[14px] font-bold text-slate-500 mb-2.5 px-4">{t('profile.section_other', '其他')}</h4>
          <div className="bg-white border-y border-gray-50 divide-y divide-gray-100">
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

            <div 
              onClick={() => setShowFeedbackModal(true)}
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

        {/* 5. Logout Button */}
        <div className="text-center py-2 mb-4">
          <button 
            id="btn_logout_action"
            onClick={async () => {
              await logout().catch(() => undefined);
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

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-end justify-center z-40">
          <div className="w-full bg-white rounded-t-[28px] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-black text-slate-800">{t('profile.item.feedback', '帮助与反馈')}</h3>
              <button
                onClick={() => setShowFeedbackModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center active:scale-95"
              >
                ✕
              </button>
            </div>
            <textarea
              value={feedbackContent}
              onChange={(event) => setFeedbackContent(event.target.value)}
              maxLength={2000}
              rows={5}
              className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[14px] text-slate-700 outline-none focus:border-[#4FACFE]"
              placeholder={text('请描述遇到的问题或建议', 'Describe the issue or suggestion')}
            />
            <input
              value={feedbackContact}
              onChange={(event) => setFeedbackContact(event.target.value)}
              maxLength={160}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[14px] text-slate-700 outline-none focus:border-[#4FACFE]"
              placeholder={text('联系方式（选填）', 'Contact (optional)')}
            />
            <button
              onClick={() => void handleSubmitFeedback()}
              disabled={feedbackSubmitting}
              className="w-full h-12 rounded-full bg-[#4FACFE] text-white text-[14px] font-extrabold active:scale-98 disabled:opacity-60"
            >
              {feedbackSubmitting ? text('提交中...', 'Submitting...') : text('提交反馈', 'Submit Feedback')}
            </button>
          </div>
        </div>
      )}

      {/* Profile Edit Modal */}
      {showProfileEditModal && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-end justify-center z-40">
          <div className="w-full bg-white rounded-t-[28px] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-black text-slate-800">{text('编辑个人资料', 'Edit Profile')}</h3>
              <button
                onClick={() => setShowProfileEditModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center active:scale-95"
              >
                ✕
              </button>
            </div>
            <input
              value={profileNameDraft}
              onChange={(event) => setProfileNameDraft(event.target.value)}
              maxLength={48}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[14px] text-slate-700 outline-none focus:border-[#4FACFE]"
              placeholder={text('昵称', 'Nickname')}
            />
            <textarea
              value={profileSignatureDraft}
              onChange={(event) => setProfileSignatureDraft(event.target.value)}
              maxLength={120}
              rows={3}
              className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[14px] text-slate-700 outline-none focus:border-[#4FACFE]"
              placeholder={text('个性签名', 'Signature')}
            />
            <button
              onClick={() => void handleSaveProfile()}
              disabled={profileSaving}
              className="w-full h-12 rounded-full bg-[#4FACFE] text-white text-[14px] font-extrabold active:scale-98 disabled:opacity-60"
            >
              {profileSaving ? text('保存中...', 'Saving...') : text('保存资料', 'Save Profile')}
            </button>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQRModal && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-6 z-40">
          <div className="bg-white rounded-3xl w-full max-w-xs p-6 shadow-2xl flex flex-col items-center text-center space-y-4">
            
            <div className="w-full flex justify-end">
              <button 
                onClick={() => setShowQRModal(false)}
                className="w-7 h-7 rounded-full bg-gray-100 text-gray-400 hover:text-gray-800 flex items-center justify-center font-bold active:bg-gray-200 text-xs"
              >
                ✕
              </button>
            </div>

            <div className="text-center">
              <h3 className="text-[15px] font-black text-slate-800">{t('profile.qr_title', '轨迹工坊跑者名片')}</h3>
              <p className="text-[10px] text-slate-400 mt-1">{t('profile.qr_desc', '扫码一键添加跑友 / 跟踪他的轨迹作品')}</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-gray-100 relative">
              <div className="flex items-center space-x-2.5 pb-3 border-b border-gray-200/60 mb-3 text-left">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#4FACFE] to-[#00F2FE] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                  明
                </div>
                <div>
              <h4 className="text-[13px] font-bold text-slate-800">{profile?.displayName || t('profile.nickname', '跑者小明')}</h4>
              <p className="text-[9px] text-slate-400 mt-0.5 leading-none">{text(`累计跑量 ${stats.totalDistanceKm}km | ${profile?.badge || '新手跑者'}`, `Total ${stats.totalDistanceKm}km | ${profile?.badge || 'New Runner'}`)}</p>
                </div>
              </div>

              <div className="w-40 h-40 bg-white p-3 rounded-xl flex items-center justify-center shadow-inner relative overflow-hidden">
                <svg viewBox="0 0 100 100" className="w-full h-full text-slate-800">
                  <rect x="0" y="0" width="25" height="25" fill="currentColor" />
                  <rect x="5" y="5" width="15" height="15" fill="white" />
                  <rect x="9" y="9" width="7" height="7" fill="currentColor" />

                  <rect x="75" y="0" width="25" height="25" fill="currentColor" />
                  <rect x="80" y="5" width="15" height="15" fill="white" />
                  <rect x="84" y="9" width="7" height="7" fill="currentColor" />

                  <rect x="0" y="75" width="25" height="25" fill="currentColor" />
                  <rect x="5" y="80" width="15" height="15" fill="white" />
                  <rect x="9" y="84" width="7" height="7" fill="currentColor" />

                  <path d="M35,5 h5 v5 h-5 z M45,0 h10 v5 h-5 v10 h-5 z M60,5 h10 v5 h-10 z M35,20 h5 v10 h-5 z M50,25 h15 v5 h-15 z M70,25 h5 v5 h-5 z M80,30 h10 v10 h-10 z M15,35 h15 v5 h-15 z" fill="currentColor" />
                  <path d="M35,45 h10 v15 h-10 z M55,40 h15 v5 h-15 z M75,45 h10 v5 h-10 z M90,55 h10 v10 h-10 z M5,55 h10 v10 h-10 z M20,60 h10 v15 h-10 z M50,60 h10 v10 h-10 z M70,60 h20 v5 h-20 z" fill="currentColor" />
                  <path d="M35,80 h15 v15 h-15 z M60,80 h15 v5 h-15 z M80,80 h15 v15 h-15 z M90,70 h10 v10 h-10 z M55,90 h10 v10-10 z M75,90 h15 v10 h-15 z M5,30 h10 v10 h-10 z" fill="currentColor" />

                  <rect x="38" y="38" width="24" height="24" fill="white" rx="4" />
                  <rect x="40" y="40" width="20" height="20" fill="url(#qrGradient)" rx="3" />
                  <defs>
                    <linearGradient id="qrGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#4FACFE" />
                      <stop offset="100%" stopColor="#00F2FE" />
                    </linearGradient>
                  </defs>
                  <path d="M47,44 A1.5,1.5 0 1,1 50,44 A1.5,1.5 0 1,1 47,44 M47,46.5 L49,49 L46,52 L51,55" fill="none" stroke="white" strokeWidth="1" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            <button
              onClick={() => void handleSaveQrCard()}
              disabled={qrSaving}
              className="w-full py-2.5 bg-gradient-to-r from-[#4FACFE] to-[#00F2FE] hover:brightness-105 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition-all shrink-0 disabled:opacity-60"
            >
              {qrSaving ? text('生成中...', 'Generating...') : t('profile.save_qr', '保存至系统相册')}
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
