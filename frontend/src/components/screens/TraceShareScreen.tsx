/**
 * TraceShareScreen - 轨迹分享预览页
 *
 * 从原 CommunityScreens.tsx 拆分而来。
 * 功能：轨迹发布页面，用户可编辑分享内容、上传图片、添加主题标签，
 * 并选择第三方平台（微信/朋友圈/小红书/抖音/相册）分享。
 *
 * @source 拆分自 components/CommunityScreens.tsx (SCREEN 23)
 */
import { useState, useEffect } from 'react';
import { miniToast } from '../../utils';
import { ArrowLeft, User } from 'lucide-react';
import { ScreenId } from '../../types';
import { useI18n } from '../../i18n';
import {
  createCommunityPost,
  selectPost,
  uploadCommunityMedia,
} from '../../api/community';

export function TraceShareScreen({ onNavigate }: { onNavigate: (screen: ScreenId) => void }) {
  const { text } = useI18n();
  const [description, setDescription] = useState('');
  const [topicTags, setTopicTags] = useState<string[]>([]);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState('');
  const [publishing, setPublishing] = useState(false);

  const handlePublish = async () => {
    if (publishing) return;
    setPublishing(true);
    try {
      const uploadedMedia = mediaFile ? await uploadCommunityMedia(mediaFile) : null;
      const post = await createCommunityPost({
        title: text('路线分享', 'Route Share'),
        content: description.trim() || text('分享一次新的 TraceCraft 路线。', 'Sharing a new TraceCraft route.'),
        topicTags,
        metrics: { distanceKm: 5.01, duration: '32:15', pace: '6\'27" /km' },
        mediaPayload: uploadedMedia ? { shapeType: 'heart', images: [uploadedMedia] } : { shapeType: 'heart' },
      });
      selectPost(post.id);
      miniToast(text('轨迹已提交审核，通过后将在公开社区展示', 'Route submitted for review. It will appear after approval.'));
      setTimeout(() => {
        onNavigate('square');
      }, 400);
    } catch {
      miniToast(text('发布失败，请稍后重试', 'Publish failed. Try again later.'));
    } finally {
      setPublishing(false);
    }
  };

  const handleSelectTag = (tagId: string) => {
    if (topicTags.includes(tagId)) {
      setTopicTags(prev => prev.filter(t => t !== tagId));
    } else {
      setTopicTags(prev => [...prev, tagId]);
    }
  };

  const handleMediaChange = (file: File | null) => {
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaFile(file);
    setMediaPreview(file ? URL.createObjectURL(file) : '');
  };

  useEffect(() => () => {
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
  }, [mediaPreview]);

  return (
    <div className="w-full h-full bg-[#FFFFFF] flex flex-col justify-between overflow-y-auto text-slate-800 animate-fadeIn select-none">
      {/* Top Header */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-gray-100 shrink-0 bg-white">
        <button onClick={() => onNavigate('success')} className="p-1 hover:bg-neutral-100 rounded-full">
          <ArrowLeft size={18} className="text-slate-700" />
        </button>
        <span className="text-[16px] font-bold text-slate-900">{text('分享轨迹', 'Share Route')}</span>
        <button
          onClick={handlePublish}
          disabled={publishing}
          className="text-[14px] text-cyan-600 font-extrabold px-1.5 py-0.5 rounded-full hover:bg-cyan-50 disabled:opacity-50"
        >
          {publishing ? text('发布中', 'Publishing') : text('发布', 'Publish')}
        </button>
      </div>

      {/* Share Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        
        {/* CENTER HIGH-END SHARE CARD PREVIEW */}
        <div className="bg-white p-4 rounded-[24px] shadow-[0_10px_25px_rgba(0,0,0,0.06)] border border-slate-100 max-w-[290px] mx-auto text-center relative overflow-hidden flex flex-col items-stretch space-y-3">
          
          {/* Card Top Branding */}
          <div className="flex items-center justify-between text-left pb-2 border-b border-slate-50">
            <div className="flex items-center space-x-1.5">
              <div className="w-5 h-5 bg-gradient-to-r from-[#4FACFE] to-[#00F2FE] rounded-md flex items-center justify-center font-black text-white text-[9px]">
                TC
              </div>
            <span className="text-[10px] font-black text-slate-800">{text('轨迹发布', 'Route Publish')}</span>
            </div>
            <span className="text-[8px] text-slate-400 font-mono">{text('发布状态', 'Status')}</span>
          </div>

          {/* Card Content Route */}
          <div className="h-[105px] bg-slate-50 rounded-xl relative flex items-center justify-center border border-slate-100">
            <svg className="w-24 h-24 text-rose-500 animate-pulse" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="4.5">
              <path d="M 50,75 C 10,40 25,10 50,35 C 75,10 90,40 50,75 Z" />
            </svg>
            <span className="absolute bottom-1.5 left-2 bg-slate-900/80 text-white text-[8px] px-1.5 rounded font-mono">
              5.01 km
            </span>
          </div>

          <div>
            <h4 className="text-[14px] font-black text-slate-900">{text('路线名称', 'Route Name')}</h4>
            <p className="text-[9px] text-slate-400 mt-1 font-mono">{text('用时 32:15 | 配速 6\'27" /km', 'Duration 32:15 | Pace 6\'27" /km')}</p>
          </div>

          {/* Card User Info Footer */}
          <div className="pt-2 border-t border-slate-50 flex items-center justify-between text-left">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-205 flex items-center justify-center">
                <User size={12} className="text-slate-400" />
              </div>
              <div>
                <p className="text-[9px] font-bold text-slate-900">{text('跑者小明', 'Runner Xiaoming')}</p>
                <p className="text-[7px] text-slate-400 leading-none">{text('跑出你的专属形状', 'Run your own shape')}</p>
              </div>
            </div>

            {/* Small dynamic QR code preview */}
            <div className="w-7 h-7 bg-slate-100 border border-slate-200 p-0.5 rounded flex flex-wrap gap-[1px]">
              {[...Array(9)].map((_, i) => (
                <div key={i} className={`w-[7px] h-[7px] ${i % 3 === 0 || i === 7 || i === 2 ? 'bg-slate-800' : 'bg-transparent'}`}></div>
              ))}
            </div>
          </div>
        </div>

        {/* Edit fields option */}
        <div className="space-y-4 pt-2">
          
          {/* Note Input */}
          <div>
            <span className="text-[13px] font-black text-slate-900 block mb-1.5">{text('编辑分享内容', 'Edit share content')}</span>
            <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 flex items-start space-x-1.5">
              <textarea 
                className="bg-transparent border-none w-full text-[12px] text-slate-800 placeholder:text-slate-400 focus:outline-none min-h-[50px] resize-none leading-relaxed"
                placeholder={text('编辑轨迹的精彩描述并填写更多信息', 'Write a great route description and more details')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <div>
            <span className="text-[13px] font-black text-slate-900 block mb-1.5">{text('添加图片', 'Add image')}</span>
            <label className="block rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-3 text-center text-[11px] font-bold text-slate-500 cursor-pointer active:scale-[0.99]">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) => handleMediaChange(event.target.files?.[0] || null)}
              />
              {mediaPreview ? (
                <img src={mediaPreview} alt="" className="mx-auto max-h-32 rounded-xl object-cover" />
              ) : (
                text('选择一张轨迹图片或运动照片', 'Choose a route image or running photo')
              )}
            </label>
          </div>

          {/* Hashtag choices */}
          <div>
            <p className="text-[11px] text-slate-400 font-semibold mb-1.5">{text('发布主题标签:', 'Publish hashtags:')}</p>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'heart_run', cn: '#爱心跑', en: '#HeartRun' },
                { id: 'route_plan', cn: '#轨迹规划', en: '#RoutePlan' },
                { id: 'run_checkin', cn: '#跑步打卡', en: '#RunCheckin' },
                { id: 'fast_run', cn: '#极速运动', en: '#FastRun' }
              ].map(tag => {
                const tagLabel = text(tag.cn, tag.en);
                const selected = topicTags.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    onClick={() => handleSelectTag(tag.id)}
                    className={`px-3 py-1 rounded-full text-[10.5px] font-extrabold transition-all border ${
                      selected
                        ? 'bg-cyan-100/60 border-cyan-300 text-cyan-600'
                        : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {tagLabel}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Social Platforms Selection */}
          <div>
            <span className="text-[13px] font-black text-slate-900 block mb-3">{text('分享到第三方平台', 'Share to platforms')}</span>
            <div className="grid grid-cols-5 gap-1.5 text-center">
              <button 
                onClick={() => miniToast(text('已唤起微信好友共享通道', 'Opened WeChat share flow'))}
                className="flex flex-col items-center space-y-1.5 cursor-pointer group"
              >
                <div className="w-[45px] h-[45px] rounded-full bg-emerald-500 hover:brightness-105 active:scale-95 transition-all flex items-center justify-center text-white shadow-xs">
                  {text('微信', 'WeChat')}
                </div>
                <span className="text-[10px] text-slate-500 font-medium leading-none">{text('微信', 'WeChat')}</span>
              </button>

              <button 
                onClick={() => miniToast(text('已唤起朋友圈多图分享面板', 'Opened Moments share panel'))}
                className="flex flex-col items-center space-y-1.5 cursor-pointer group"
              >
                <div className="w-[45px] h-[45px] rounded-full bg-sky-500 hover:brightness-105 active:scale-95 transition-all flex items-center justify-center text-white shadow-xs">
                  {text('圈子', 'Moments')}
                </div>
                <span className="text-[10px] text-slate-500 font-medium leading-none">{text('朋友圈', 'Moments')}</span>
              </button>

              <button 
                onClick={() => miniToast(text('已导入小红书卡片发布面板', 'Opened Xiaohongshu card share panel'))}
                className="flex flex-col items-center space-y-1.5 cursor-pointer group"
              >
                <div className="w-[45px] h-[45px] rounded-full bg-rose-500 hover:brightness-105 active:scale-95 transition-all flex items-center justify-center text-white shadow-xs">
                  {text('红书', 'XHS')}
                </div>
                <span className="text-[10px] text-slate-500 font-medium leading-none">{text('小红书', 'Xiaohongshu')}</span>
              </button>

              <button 
                onClick={() => miniToast(text('已开启抖音精美音乐原片合成', 'Opened Douyin video composer'))}
                className="flex flex-col items-center space-y-1.5 cursor-pointer group"
              >
                <div className="w-[45px] h-[45px] rounded-full bg-slate-900 hover:brightness-105 active:scale-95 transition-all flex items-center justify-center text-white shadow-xs">
                  {text('抖音', 'Douyin')}
                </div>
                <span className="text-[10px] text-slate-500 font-medium leading-none">{text('抖音', 'Douyin')}</span>
              </button>

              <button 
                onClick={() => miniToast(text('轨迹成果长图已保存至个人相册', 'Route poster saved to photos'))}
                className="flex flex-col items-center space-y-1.5 cursor-pointer group"
              >
                <div className="w-[45px] h-[45px] rounded-full bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all flex items-center justify-center text-slate-600 shadow-xs">
                  {text('相册', 'Photos')}
                </div>
                <span className="text-[10px] text-slate-500 font-medium leading-none">{text('保存相册', 'Save to photos')}</span>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
