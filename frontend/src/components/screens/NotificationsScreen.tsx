/**
 * NotificationsScreen - 消息通知页
 *
 * 从原 CommunityScreens.tsx 拆分而来。
 * 功能：展示用户的消息通知列表，支持按全部/点赞/评论/新粉/系统分类筛选。
 * 包含实时消息推送监听、单条已读标记和全部标记已读功能。
 *
 * @source 拆分自 components/CommunityScreens.tsx (SCREEN 26)
 */
import { useState, useEffect } from 'react';
import { miniToast } from '../../utils';
import { ArrowLeft, Settings, Volume2 } from 'lucide-react';
import { ScreenId } from '../../types';
import { useI18n } from '../../i18n';
import {
  listNotifications,
  markNotificationsRead,
  selectPost,
  type NotificationItem,
} from '../../api/community';
import { onRealtime } from '../../services/realtime';
import { formatRelativeTime } from './community-utils';

export function NotificationsScreen({ onNavigate }: { onNavigate: (screen: ScreenId) => void }) {
  const { text } = useI18n();
  const [activeTab, setActiveTab] = useState<'all' | 'like' | 'comment' | 'follow' | 'sys'>('all');
  const [showEmpty, setShowEmpty] = useState(false);
  const [msgList, setMsgList] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [followBacks, setFollowBacks] = useState<Record<string, boolean>>({
    'white': false
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listNotifications(activeTab, 1, 50)
      .then((result) => {
        if (!cancelled) setMsgList(result.notifications);
      })
      .catch(() => {
        if (!cancelled) setMsgList([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  useEffect(() => {
    return onRealtime('notification', (notification) => {
      const eventType = notification.type === 'system' ? 'sys' : notification.type;
      if (activeTab !== 'all' && activeTab !== eventType) return;
      setMsgList(prev => {
        if (prev.some(item => item.id === notification.id)) return prev;
        return [{ ...notification, isRead: false, metadata: notification.metadata || {} }, ...prev];
      });
      setShowEmpty(false);
    });
  }, [activeTab]);

  const handleMarkAllRead = async () => {
    await markNotificationsRead();
    setMsgList(prev => prev.map(item => ({ ...item, isRead: true })));
    miniToast(text('已清空未读消息列表', 'Cleared unread notifications'));
  };

  const filtered = msgList;
  const unreadCount = msgList.filter(m => !m.isRead).length;

  return (
    <div className="w-full h-full bg-[#FFFFFF] flex flex-col justify-between text-slate-800 animate-fadeIn select-none">
      
      {/* Top Header */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-gray-100 shrink-0 bg-white">
        <button onClick={() => onNavigate('square')} className="p-1 hover:bg-neutral-100 rounded-full">
          <ArrowLeft size={18} className="text-slate-700" />
        </button>
        <span className="text-[16px] font-bold text-slate-900">{text('消息通知', 'Notifications')}</span>
        <div className="flex items-center space-x-1.5 shrink-0">
          <button 
            onClick={() => {
              setShowEmpty(!showEmpty);
              miniToast(showEmpty ? text('显示全部消息', 'Show all notifications') : text('清空消息列表', 'Clear notification list'));
            }} 
            className="text-[10px] text-cyan-600 font-extrabold hover:underline"
          >
            {showEmpty ? text('显示全部消息', 'Show all notifications') : text('清空消息', 'Clear notifications')}
          </button>
          <button onClick={() => miniToast(text('打开消息设置', 'Open notification settings'))} className="p-1 hover:bg-neutral-100 rounded-full">
            <Settings size={16} className="text-slate-650" />
          </button>
        </div>
      </div>

      {/* Categories Horizontal TAB shrink-0 */}
      <div className="px-4 py-2 flex space-x-1.5 overflow-x-auto scrollbar-none shrink-0 border-b border-slate-50 bg-white">
        {(['all', 'like', 'comment', 'follow', 'sys'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={
              'px-3 py-1 rounded-full text-xs shrink-0 font-bold transition-all ' +
               (activeTab === tab
                 ? 'bg-linear-to-r from-[#4FACFE] to-[#00F2FE] text-white'
                 : 'bg-slate-50 border border-slate-100 text-slate-500 hover:bg-slate-100')
            }
          >
            {tab === 'all' && text('全部', 'All')}
            {tab === 'like' && text('点赞', 'Likes')}
            {tab === 'comment' && text('评论', 'Comments')}
            {tab === 'follow' && text('新粉', 'New followers')}
            {tab === 'sys' && text('系统', 'System')}
          </button>
        ))}
      </div>

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="py-28 text-center text-[12px] text-slate-400 font-bold">{text('正在加载消息...', 'Loading notifications...')}</div>
        ) : (showEmpty || filtered.length === 0) ? (
          
          /* EMPTY NOTIFICATIONS STATE */
          <div className="py-28 flex flex-col items-center justify-center text-center px-6 animate-pulse select-none space-y-4">
            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
              <svg className="w-9 h-9" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25H4.5a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5H4.5a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
              </svg>
            </div>
            <div>
            <p className="text-[16px] font-bold text-slate-800">{text('暂无消息', 'No notifications')}</p>
            <p className="text-[12px] text-slate-400 mt-1 max-w-xs leading-normal">
                {text('当前无消息、系统提醒或关注动态时显示此区域。', 'Shown when there are no messages, system alerts, or follow updates.')}
            </p>
          </div>
        </div>

        ) : (
          
          /* MESSAGES LISTED ROW */
          <div className="divide-y divide-slate-100/70">
            {filtered.map(m => {
              const hasUnreadDot = !m.isRead;

              return (
                <div 
                  key={m.id}
                  onClick={async () => {
                    // Mark single clicked unread as read
                    if (hasUnreadDot) {
                      await markNotificationsRead(m.id);
                      setMsgList(prev => prev.map(item => item.id === m.id ? { ...item, isRead: true } : item));
                    }
                    if (m.type === 'like' || m.type === 'comment') {
                      if (m.targetId) selectPost(m.targetId);
                      onNavigate('post_detail');
                    } else if (m.type === 'follow') {
                      onNavigate('profile');
                    } else if (m.type === 'system') {
                      onNavigate('square');
                    }
                  }}
                  className={
                    'p-3.5 flex items-center justify-between text-left hover:bg-slate-50/50 cursor-pointer transition-colors relative ' +
                    (hasUnreadDot ? 'bg-cyan-50/20' : 'bg-white')
                  }
                >
                  {/* Left blue unread dot element */}
                  {hasUnreadDot && (
                    <span className="absolute left-2 w-2 h-2 rounded-full bg-[#4FACFE]"></span>
                  )}

                  <div className="flex items-start space-x-3 pl-1 overflow-hidden">
                    {/* User Avatar icon */}
                    {m.type === 'system' ? (
                      <div className="w-[42px] h-[42px] rounded-full bg-cyan-100 flex items-center justify-center text-cyan-600 shrink-0">
                        <Volume2 size={18} />
                      </div>
                    ) : (
                      <div className="w-[42px] h-[42px] rounded-full bg-slate-100 border border-slate-205 flex items-center justify-center shrink-0 text-slate-400 font-bold text-sm">
                        {(m.actorUserId || m.title).slice(0, 1)}
                      </div>
                    )}

                    <div className="text-left overflow-hidden">
                      <p className="text-[13px] text-slate-900 font-bold">
                        <span>{m.title}</span>
                      </p>
                      <p className="text-[12px] text-slate-600 truncate max-w-[170px] mt-0.5 leading-normal">
                        {m.body}
                      </p>
                      <span className="text-[9.5px] text-slate-400 mt-1 block font-mono font-medium leading-none">
                        {formatRelativeTime(m.createdAt, text)}
                      </span>
                    </div>
                  </div>

                  {/* Right segment action/thumbnail */}
                  <div className="shrink-0 flex items-center">
                    {m.type === 'follow' && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          const active = followBacks['white'];
                          setFollowBacks(prev => ({ ...prev, 'white': !active }));
                          miniToast(!active ? text('已关注', 'Followed') : text('已取消关注', 'Unfollowed'));
                        }}
                        className={
                          'text-[10px] font-extrabold px-3 py-1 rounded-full border transition-all ' +
                          (followBacks['white']
                             ? 'bg-slate-100 border-slate-200 text-slate-500'
                             : 'border-cyan-500 text-cyan-600 hover:bg-cyan-50 active:scale-95')
                        }
                      >
                        {followBacks['white'] ? text('已关注', 'Followed') : text('回关', 'Follow back')}
                      </button>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom mark as read action bar */}
      {!showEmpty && unreadCount > 0 && (
        <div className="px-4 py-2 border-t border-slate-50 text-center bg-white shrink-0">
          <button 
            onClick={handleMarkAllRead}
            className="text-[12px] text-cyan-600 hover:text-cyan-700 font-black hover:underline"
          >
            {text('全部标记已读', 'Mark all as read')}
          </button>
        </div>
      )}
      
    </div>
  );
}
