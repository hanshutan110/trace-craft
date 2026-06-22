/**
 * SquareScreen - 社区广场 Feed
 *
 * 从原 CommunityScreens.tsx 拆分而来。
 * 功能：社区广场页面，双列瀑布流展示社区帖子，支持按推荐/热门/最新/关注筛选。
 * 点击帖子跳转到详情页。
 *
 * @source 拆分自 components/CommunityScreens.tsx (SCREEN 24)
 */
import { useState, useEffect } from 'react';
import { miniToast } from '../../utils';
import { Search, Bell, User, Heart } from 'lucide-react';
import { ScreenId } from '../../types';
import { useI18n } from '../../i18n';
import {
  listCommunityPosts,
  selectPost,
  type CommunityPostItem,
} from '../../api/community';
import { communityShapeSvg, primaryCommunityImage } from './community-utils';

export function SquareScreen({ onNavigate }: { onNavigate: (screen: ScreenId) => void }) {
  const { text } = useI18n();
  const [activeTab, setActiveTab] = useState<'recommend' | 'hot' | 'latest' | 'follow'>('recommend');
  const [posts, setPosts] = useState<CommunityPostItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listCommunityPosts(activeTab)
      .then((items) => {
        if (!cancelled) setPosts(items);
      })
      .catch(() => {
        if (!cancelled) setPosts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  return (
    <div className="w-full h-full bg-[#FFFFFF] flex flex-col justify-between text-slate-800 animate-fadeIn select-none">
      
      {/* Top Header */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-gray-100 shrink-0 bg-white">
        <div className="w-10"></div> {/* spacer */}
        <span className="text-[18px] font-black text-slate-900 tracking-tight">{text('发现', 'Discover')}</span>
        <div className="flex space-x-1 shrink-0">
          <button onClick={() => onNavigate('search')} className="p-1 hover:bg-neutral-100 rounded-full">
            <Search size={18} className="text-slate-600" />
          </button>
          <button onClick={() => onNavigate('notifications')} className="p-1 hover:bg-neutral-100 rounded-full relative">
            <Bell size={18} className="text-slate-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full"></span>
          </button>
        </div>
      </div>

      {/* Tabs list shrink-0 */}
      <div className="px-4 py-2 flex space-x-1.5 overflow-x-auto scrollbar-none shrink-0 border-b border-slate-50/60 bg-white">
        {(['recommend', 'hot', 'latest', 'follow'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all ${
              activeTab === tab
                ? 'bg-linear-to-r from-[#4FACFE] to-[#00F2FE] text-white shadow-sm'
                : 'bg-slate-50 border border-slate-100 text-slate-500 hover:bg-slate-100'
            }`}
          >
            {tab === 'recommend' && text('推荐', 'Recommended')}
            {tab === 'hot' && text('热门', 'Hot')}
            {tab === 'latest' && text('最新', 'Latest')}
            {tab === 'follow' && text('关注', 'Following')}
          </button>
        ))}
      </div>

      {/* Waterfall Grid List 2 columns scrollable */}
      <div className="flex-1 overflow-y-auto px-4 py-3 pb-16">
        {loading && (
          <div className="py-20 text-center text-[12px] text-slate-400 font-bold">{text('正在加载广场...', 'Loading feed...')}</div>
        )}
        {!loading && posts.length === 0 && (
          <div className="py-20 text-center text-[12px] text-slate-400 font-bold">{text('暂无社区作品，发布第一条轨迹吧', 'No community posts yet. Publish the first route.')}</div>
        )}
        <div className="grid grid-cols-2 gap-3">
          {posts.map((item, index) => {
            const shapeType = String(item.mediaPayload?.shapeType || 'heart');
            const imageUrl = primaryCommunityImage(item);
            const distance = Number(item.metrics?.distanceKm || item.metrics?.distance || 0);
            const height = ['h-[110px]', 'h-[100px]', 'h-[120px]', 'h-[95px]'][index % 4];
            return (
            <div
              key={item.id}
              onClick={() => {
                selectPost(item.id);
                onNavigate('post_detail');
              }}
              className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between overflow-hidden cursor-pointer hover:shadow-md transition-shadow active:scale-[0.99] group relative"
            >
              {/* Graphic container */}
              <div className={`${height} bg-slate-50 flex items-center justify-center p-3 relative select-none border-b border-slate-50 shrink-0`}>
                {imageUrl ? (
                  <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                ) : communityShapeSvg(shapeType)}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    miniToast(text(`已收藏：${item.title}`, `Saved: ${item.titleEn}`));
                  }}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/90 hover:bg-white shadow-xs flex items-center justify-center text-rose-500 hover:text-red-600 transition-colors z-10"
                >
                  <Heart size={12} fill="none" />
                </button>
              </div>

              {/* description footer */}
              <div className="p-3 text-left">
                <h4 className="text-[13px] font-black text-slate-900 group-hover:text-cyan-600 transition-colors">{text(item.title, item.titleEn)}</h4>
                
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 font-semibold">
                  <span className="flex items-center space-x-1 max-w-[50px] truncate">
                    <User size={10} />
                    <span className="truncate">{item.author}</span>
                  </span>
                  <span>{text('距离', 'Distance')} {distance ? `${distance.toFixed(1)}km` : '--'}</span>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 pb-0.5 font-bold border-t border-slate-50/50 pt-2 text-[#4FACFE]">
                  <span>❤ {item.likeCount}</span>
                  <span>💬 {item.commentCount}</span>
                </div>
              </div>
            </div>
          );
          })}
        </div>

          <p className="text-[11px] text-slate-400 py-4 text-center">
          {text('已经到底啦', 'No more posts')}
          </p>
      </div>

    </div>
  );
}
