/**
 * profile-settings-utils - 个人中心与设置模块共享工具函数
 *
 * 从原 ProfileAndSettings.tsx 拆分而来。
 * 功能：提供 providerLabel（账号绑定标签）和 assetUrl（资源地址拼接）两个公共工具函数，
 *       供 ProfileScreen 和 SettingsScreen 共同使用。
 *
 * @source 拆分自 components/ProfileAndSettings.tsx (共享工具函数)
 */

import { API_BASE } from '../../api/client';

/**
 * 根据登录渠道返回绑定状态文案
 * @param provider - 登录渠道标识（wechat / alipay / phone 等）
 * @param text     - 国际化文案函数 (cn, en) => string
 */
export function providerLabel(provider: string, text: (cn: string, en: string) => string): string {
  if (provider === 'wechat') return text('已绑定微信', 'WeChat linked');
  if (provider === 'alipay') return text('已绑定支付宝', 'Alipay linked');
  if (provider === 'phone') return text('已绑定手机号', 'Phone linked');
  return text('游客账号', 'Guest account');
}

/**
 * 拼接后端返回的资源 URL，自动处理相对路径和绝对路径
 * @param url - 后端返回的资源路径（可能为空、相对路径或完整 URL）
 */
export function assetUrl(url: string | undefined): string {
  if (!url) return '';
  if (/^https?:\/\//.test(url)) return url;
  return `${API_BASE.replace(/\/api$/, '')}${url.startsWith('/') ? url : `/${url}`}`;
}
