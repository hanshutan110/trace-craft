import type {ReactElement, ReactNode} from 'react';
import {AuditOutlined, FileTextOutlined, TeamOutlined} from '@ant-design/icons';
import {Tag} from 'antd';
import type {AdminModule} from '../../shared/admin';

export const moduleMeta: Record<AdminModule, {title: string; subtitle: string; createText: string; icon: ReactNode}> = {
  users: {
    title: '管理员用户',
    subtitle: '账号、角色、状态管理',
    createText: '新增管理员',
    icon: <TeamOutlined />,
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
