/**
 * PostDetailScreen - 社区帖子详情页
 *
 * 从原 CommunityScreens.tsx 拆分而来。
 * 功能：展示社区帖子详情，包含作者信息、地图预览、运动数据、点赞/评论/收藏交互、
 * 评论列表（支持回复）和关注功能。
 *
 * @source 拆分自 components/CommunityScreens.tsx (SCREEN 25)
 */
import React, { useState, useEffect } from 'react';
import { miniToast } from '../../utils';
import {
  ArrowLeft,
  MoreVertical,
  Send,
  Heart,
  MessageCircle,
  Star,
} from 'lucide-react';
import { ScreenId } from '../../types';
import { useI18n } from '../../i18n';
import {
  addCommunityComment,
  getCommunityPost,
  getSelectedPostId,
  toggleCommunityLike,
  toggleFollowUser,
  type CommunityCommentItem,
  type CommunityPostItem,
} from '../../api/community';
import { formatRelativeTime, primaryCommunityImage } from './community-utils';

export function PostDetailScreen({ onNavigate }: { onNavigate: (screen: ScreenId) => void }) {
  const { text } = useI18n();
  const [isFollowing, setIsFollowing] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [likesCount, setLikesCount] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [comments, setComments] = useState<CommunityCommentItem[]>([]);
  const [replyTarget, setReplyTarget] = useState<CommunityCommentItem | null>(null);
  const [post, setPost] = useState<CommunityPostItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const postId = getSelectedPostId();
    if (!postId) {
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }
    getCommunityPost(postId)
      .then((data) => {
        if (cancelled) return;
        setPost(data.post);
        setComments(data.comments);
        setLikesCount(data.post.likeCount);
        setHasLiked(data.post.hasLiked);
        setIsFollowing(data.post.isFollowing);
      })
      .catch(() => {
        if (!cancelled) setPost(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || !post) return;
    try {
      const newComment = await addCommunityComment(post.id, commentInput.trim(), replyTarget?.id);
      setComments(prev => [...prev, newComment]);
      setCommentInput('');
      setReplyTarget(null);
      setPost(prev => prev ? { ...prev, commentCount: prev.commentCount + 1 } : prev);
      miniToast(text('评论发布成功！', 'Comment posted successfully!'));
    } catch {
      miniToast(text('评论失败，请稍后重试', 'Comment failed. Try again later.'));
    }
  };

  const handleLike = async () => {
    if (!post) return;
    try {
      const result = await toggleCommunityLike(post.id);
      setLikesCount(result.likeCount);
      setHasLiked(result.liked);
      miniToast(result.liked ? text('已点赞', 'Liked') : text('已取消点赞', 'Like removed'));
    } catch {
      miniToast(text('点赞失败，请稍后重试', 'Like failed. Try again later.'));
    }
  };

  const handleFollow = async () => {
    if (!post) return;
    const following = await toggleFollowUser(post.userId);
    setIsFollowing(following);
    miniToast(following ? text('关注成功', 'Followed') : text('取消关注', 'Unfollowed'));
  };

  return (
    <div className="w-full h-full bg-[#FFFFFF] flex flex-col justify-between overflow-y-auto text-slate-800 animate-fadeIn select-none">
      {/* Top Bar Navigation */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-gray-100 shrink-0 bg-white">
        <button onClick={() => onNavigate('profile')} className="p-1 hover:bg-neutral-100 rounded-full">
          <ArrowLeft size={18} className="text-slate-700" />
        </button>
        <span className="text-[14px] font-bold text-slate-900">{text('帖子详情', 'Post Detail')}</span>
        <button onClick={() => miniToast(text('打开更多操作', 'Open more actions'))} className="p-1 hover:bg-neutral-100 rounded-full">
          <MoreVertical size={18} className="text-slate-600" />
        </button>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto pb-4">
        {loading && (
          <div className="py-20 text-center text-[12px] text-slate-400 font-bold">{text('正在加载帖子...', 'Loading post...')}</div>
        )}
        {!loading && !post && (
          <div className="py-20 text-center text-[12px] text-slate-400 font-bold">{text('帖子不存在或已删除', 'Post not found')}</div>
        )}
        {post && (
        <>
        
        {/* Author info block */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="w-11 h-11 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600">
              M
            </div>
            <div className="text-left">
              <h4 className="text-[14px] font-bold text-slate-900">{post.author}</h4>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">{formatRelativeTime(post.createdAt, text)}</p>
            </div>
          </div>

          <button
            onClick={() => { void handleFollow(); }}
            className={
              'px-3.5 py-1 text-xs font-bold rounded-full border transition-all ' +
               (isFollowing
                  ? 'bg-slate-100 border-slate-200 text-slate-500'
                  : 'border-cyan-500 text-cyan-600 hover:bg-cyan-50 active:scale-95')
            }
          >
            {isFollowing ? text('取消关注', 'Unfollow') : text('关注', 'Follow')}
          </button>
        </div>

        {/* Map Preview Area */}
        <div className="h-[200px] bg-slate-50 border-b border-slate-100 relative overflow-hidden flex items-center justify-center">
          {primaryCommunityImage(post) ? (
            <img src={primaryCommunityImage(post)} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <>
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:18px_18px] opacity-50"></div>
              <svg className="w-40 h-40 text-rose-500 drop-shadow-md relative z-10" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="4">
                <path d="M 50,75 C 10,40 25,10 50,35 C 75,10 90,40 50,75 Z" />
                <circle cx="50" cy="75" r="4.5" fill="#10B981" stroke="#FFFFFF" strokeWidth="1.5" />
              </svg>
            </>
          )}
        </div>

        {/* Post metrics card */}
        <div className="px-4 mt-3">
          <div className="bg-white p-4 rounded-[24px] shadow-[0_4px_16px_rgba(0,0,0,0.03)] border border-slate-100">
            <h3 className="text-[17px] font-black text-slate-900 text-left">{text(post.title, post.titleEn)}</h3>
            <p className="text-[12px] text-slate-500 mt-1 lines-relaxed text-left">
              {text(post.content, post.contentEn)}
            </p>

              <div className="grid grid-cols-3 gap-2 text-center pt-3 mt-3 border-t border-slate-50 select-none">
                <div className="border-r border-slate-100">
                  <span className="text-[15px] font-extrabold text-slate-900">{Number(post.metrics?.distanceKm || 0).toFixed(2)} km</span>
                  <p className="text-[9px] text-slate-400 mt-0.5">{text('距离', 'Distance')}</p>
                </div>
                <div className="border-r border-slate-100">
                  <span className="text-[15px] font-extrabold text-slate-900">{String(post.metrics?.duration || '--')}</span>
                  <p className="text-[9px] text-slate-400 mt-0.5">{text('时间', 'Time')}</p>
                </div>
              <div>
                <span className="text-[15px] font-extrabold text-slate-900">{String(post.metrics?.pace || '--')}</span>
                <p className="text-[9px] text-slate-400 mt-0.5">{text('平均配速', 'Avg pace')}</p>
              </div>
            </div>

            <div className="flex items-center space-x-2 mt-3 select-none">
              <span className="px-2 py-0.5 bg-red-50 text-red-500 text-[9px] font-bold rounded">{text('热门 活跃', 'Hot · Active')}</span>
              <span className="px-2 py-0.5 bg-rose-50 text-rose-500 text-[9px] font-bold rounded">{text('评论 经典', 'Comment · Classic')}</span>
            </div>
          </div>
        </div>

        {/* Liking comment interaction toolbar */}
        <div className="px-6 py-3 border-y border-slate-50 mt-4 flex items-center justify-around select-none">
          <button 
            onClick={handleLike}
            className="flex items-center space-x-2.5 text-slate-500 group"
          >
            <Heart size={20} fill={hasLiked ? 'red' : 'none'} className={hasLiked ? 'text-red-500' : 'text-slate-500 group-hover:text-red-500'} />
            <span className="text-[13px] font-bold">{likesCount} {text('点赞', 'Likes')}</span>
          </button>
          
          <button 
            onClick={() => miniToast(text('打开评论区', 'Open comments'))}
            className="flex items-center space-x-2.5 text-slate-500 hover:text-cyan-500"
          >
            <MessageCircle size={20} />
            <span className="text-[13px] font-bold">{comments.length} {text('评论', 'Comments')}</span>
          </button>
          
          <button 
            onClick={() => { miniToast(text('已将路线保存到本地收藏', 'Saved route locally')); }}
            className="flex items-center space-x-2.5 text-slate-500 hover:text-yellow-500"
          >
            <Star size={20} />
            <span className="text-[13px] font-bold">459 {text('收藏', 'Saves')}</span>
          </button>
        </div>

        {/* Comment segment lists */}
        <div className="px-4 mt-4 text-left">
            <span className="text-[13px] font-black text-slate-900 block mb-3">
            {text(`评论列表 (${comments.length})`, `Comments (${comments.length})`)}
            </span>

          {/* Reply state is kept visible so nested comments do not look like new top-level comments. */}
          {replyTarget && (
            <div className="mb-2 flex items-center justify-between rounded-md bg-cyan-50 px-3 py-2 text-[10px] font-bold text-cyan-700">
              <span>{text(`回复 ${replyTarget.author}`, `Replying to ${replyTarget.author}`)}</span>
              <button type="button" onClick={() => setReplyTarget(null)} className="text-slate-400 hover:text-slate-600">
                {text('取消', 'Cancel')}
              </button>
            </div>
          )}

          {/* New message input inline */}
          <form onSubmit={handleSendComment} className="flex items-center space-x-2 mb-4 bg-slate-50 pl-3 pr-1 py-1 rounded-full border border-slate-100">
            <input 
              type="text" 
              value={commentInput} 
              onChange={(e) => setCommentInput(e.target.value)}
              placeholder={replyTarget ? text('输入回复内容...', 'Write a reply...') : text('输入评论内容，文明发言...', 'Write a comment respectfully...')}
              className="bg-transparent border-none text-[11px] placeholder:text-slate-400 focus:outline-none w-full font-medium"
            />
            <button 
              type="submit"
              className="w-8 h-8 rounded-full bg-cyan-500 hover:brightness-105 active:scale-95 text-white flex items-center justify-center shrink-0 transition-all shadow-xs"
            >
              <Send size={11} className="relative left-[0.5px]" strokeWidth={2.5} />
            </button>
          </form>

          {/* lists view */}
          <div className="space-y-3 pb-4">
            {comments.map((comment) => (
              <div key={comment.id} className={`flex items-start space-x-2.5 border-b border-slate-50/60 pb-2.5 ${comment.parentCommentId ? 'ml-8' : ''}`}>
                <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-205 flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0">
                  {comment.author.slice(0, 1)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-[12px] font-bold text-slate-900">{comment.author}</span>
                    <span className="text-[9px] text-slate-400 font-mono">{formatRelativeTime(comment.createdAt, text)}</span>
                  </div>
                  <p className="text-[11.5px] text-slate-700 mt-1 lines-relaxed">{comment.content}</p>
                  <button
                    type="button"
                    onClick={() => setReplyTarget(comment)}
                    className="mt-1 text-[10px] font-bold text-slate-400 hover:text-cyan-600"
                  >
                    {text('回复', 'Reply')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        </>
        )}

      </div>

      {/* Bottom sticked action toolbar */}
      <div className="p-3 bg-white border-t border-slate-100 flex items-center space-x-3 shrink-0">
        <button 
          onClick={() => {
            miniToast(text('参数设置发布该路线', 'Publish route with parameters'));
            onNavigate('param_adjust');
          }}
          className="flex-1 py-2.5 bg-gradient-to-r from-[#4FACFE] to-[#00F2FE] hover:brightness-105 active:scale-95 select-none transition-all text-white font-extrabold text-xs rounded-full shadow-md shadow-cyan-400/20 text-center uppercase tracking-wider"
        >
          {text('使用参数发布路线', 'Publish with parameters')}
        </button>
        <button 
            onClick={() => { void handleFollow(); }}
          className="py-2.5 px-4 border border-slate-200 text-slate-500 text-xs font-black rounded-full text-center hover:bg-neutral-50 active:bg-slate-100 transition-colors"
          >
            {isFollowing ? text('已取消关注', 'Unfollowed') : text('关注', 'Follow')}
          </button>
      </div>

    </div>
  );
}
