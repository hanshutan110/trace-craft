/**
 * TraceCraft 后端通知文案国际化模块
 *
 * 拆分来源：communityService.ts 中硬编码的中文通知文案
 * 变更目的：支持多语言通知，根据用户偏好语言返回对应文案
 *
 * 支持的通知类型：
 *   - comment：收到新评论
 *   - like：收到新点赞
 *   - follow：新增关注
 *   - system：系统通知
 */

type SupportedLocale = 'zh-CN' | 'en-US';

interface NotificationTexts {
  comment: { title: string; body: (content: string) => string };
  like: { title: string; body: string };
  follow: { title: string; body: string };
  system: { title: string };
}

const texts: Record<SupportedLocale, NotificationTexts> = {
  'zh-CN': {
    comment: { title: '收到新评论', body: (content: string) => content },
    like: { title: '收到新点赞', body: '有人点赞了你的作品' },
    follow: { title: '新增关注', body: '有人关注了你' },
    system: { title: '系统通知' },
  },
  'en-US': {
    comment: { title: 'New Comment', body: (content: string) => content },
    like: { title: 'New Like', body: 'Someone liked your post' },
    follow: { title: 'New Follower', body: 'Someone followed you' },
    system: { title: 'System Notification' },
  },
};

/** 获取指定语言的通知文案（默认 zh-CN） */
export function getNotificationTexts(locale?: string): NotificationTexts {
  if (locale === 'en-US' || locale === 'en') return texts['en-US'];
  return texts['zh-CN'];
}

/** 通知类型枚举 */
export type NotificationType = 'comment' | 'like' | 'follow' | 'system';
