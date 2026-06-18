import type {ReactElement, ReactNode} from 'react';
import {AuditOutlined, CommentOutlined, FileTextOutlined, FlagOutlined, HistoryOutlined, MessageOutlined, PictureOutlined, SafetyCertificateOutlined, ShareAltOutlined, TeamOutlined, UnorderedListOutlined} from '@ant-design/icons';
import {Tag} from 'antd';
import type {AdminModule} from '../../shared/admin';

export const moduleMeta: Record<AdminModule, {title: string; subtitle: string; createText: string; icon: ReactNode}> = {
  users: {
    title: '管理员用户',
    subtitle: '账号、角色、状态管理',
    createText: '新增管理员',
    icon: <TeamOutlined />,
  },
  roles: {
    title: '角色管理',
    subtitle: '权限与模块访问控制',
    createText: '新增角色',
    icon: <SafetyCertificateOutlined />,
  },
  sessions: {
    title: '跑步会话',
    subtitle: '用户跑步会话记录',
    createText: '新增会话',
    icon: <UnorderedListOutlined />,
  },
  contents: {
    title: '内容管理',
    subtitle: '公告、FAQ、帮助与政策内容',
    createText: '新增内容',
    icon: <FileTextOutlined />,
  },
  templates: {
    title: '模板管理',
    subtitle: '地图、路线与界面模板配置',
    createText: '新增模板',
    icon: <AuditOutlined />,
  },
  communityPosts: {
    title: '社区帖子',
    subtitle: '用户发布的跑步动态与分享',
    createText: '新增帖子',
    icon: <MessageOutlined />,
  },
  comments: {
    title: '评论管理',
    subtitle: '帖子评论与回复',
    createText: '新增评论',
    icon: <CommentOutlined />,
  },
  reports: {
    title: '举报管理',
    subtitle: '用户举报与违规处理',
    createText: '新增举报',
    icon: <FlagOutlined />,
  },
  feedback: {
    title: '用户反馈',
    subtitle: '功能建议与问题反馈',
    createText: '新增反馈',
    icon: <MessageOutlined />,
  },
  assets: {
    title: '资产管理',
    subtitle: '用户上传的头像、海报等文件',
    createText: '上传资产',
    icon: <PictureOutlined />,
  },
  shareRecords: {
    title: '分享记录',
    subtitle: '用户分享到各渠道的历史',
    createText: '新增记录',
    icon: <ShareAltOutlined />,
  },
  auditLogs: {
    title: '审计日志',
    subtitle: '系统操作与安全审计记录',
    createText: '新增日志',
    icon: <HistoryOutlined />,
  },
};

export function statusTag(value: string | boolean): ReactElement {
  if (value === true) return <Tag color="success">启用</Tag>;
  if (value === false) return <Tag>停用</Tag>;
  const map: Record<string, {color: string; text: string}> = {
    active: {color: 'success', text: '启用'},
    disabled: {color: 'default', text: '禁用'},
    locked: {color: 'error', text: '锁定'},
    draft: {color: 'default', text: '草稿'},
    published: {color: 'success', text: '发布'},
    archived: {color: 'warning', text: '归档'},
  };
  const item = map[value] || {color: 'default', text: String(value)};
  return <Tag color={item.color}>{item.text}</Tag>;
}
