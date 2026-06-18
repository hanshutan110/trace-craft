import type {ReactElement} from 'react';
import {Form, Input, InputNumber, Select, Switch} from 'antd';
import type {AdminModule, RoleItem} from '../api/admin';

export function ModuleForm({module, roles}: {module: AdminModule; roles: RoleItem[]}): ReactElement {
  if (module === 'users') {
    return (
      <>
        <Form.Item name="username" label="用户名" rules={[{required: true}]}>
          <Input />
        </Form.Item>
        <Form.Item name="name" label="显示名称" rules={[{required: true}]}>
          <Input />
        </Form.Item>
        <Form.Item name="phone" label="手机号">
          <Input />
        </Form.Item>
        <Form.Item name="email" label="邮箱">
          <Input />
        </Form.Item>
        <Form.Item name="password" label="密码" rules={[{min: 10, message: '至少 10 位'}]}>
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Form.Item name="roles" label="角色">
          <Select mode="multiple" options={roles.map((role) => ({value: role.code, label: role.name}))} />
        </Form.Item>
        <Form.Item name="status" label="状态" rules={[{required: true}]}>
          <Select options={[{value: 'active', label: '启用'}, {value: 'disabled', label: '禁用'}, {value: 'locked', label: '锁定'}]} />
        </Form.Item>
      </>
    );
  }

  if (module === 'contents') {
    return (
      <>
        <Form.Item name="key" label="内容 Key" rules={[{required: true}]}>
          <Input />
        </Form.Item>
        <Form.Item name="type" label="类型" rules={[{required: true}]}>
          <Select options={[{value: 'announcement', label: '公告'}, {value: 'faq', label: 'FAQ'}, {value: 'help', label: '帮助'}, {value: 'policy', label: '政策'}]} />
        </Form.Item>
        <Form.Item name="title" label="标题" rules={[{required: true}]}>
          <Input />
        </Form.Item>
        <Form.Item name="summary" label="摘要">
          <Input />
        </Form.Item>
        <Form.Item name="body" label="正文">
          <Input.TextArea rows={6} />
        </Form.Item>
        <Form.Item name="sortOrder" label="排序">
          <InputNumber min={0} style={{width: '100%'}} />
        </Form.Item>
        <Form.Item name="status" label="状态" rules={[{required: true}]}>
          <Select options={[{value: 'draft', label: '草稿'}, {value: 'published', label: '发布'}, {value: 'archived', label: '归档'}]} />
        </Form.Item>
      </>
    );
  }

  return (
    <>
      <Form.Item name="code" label="模板编码" rules={[{required: true}]}>
        <Input />
      </Form.Item>
      <Form.Item name="name" label="模板名称" rules={[{required: true}]}>
        <Input />
      </Form.Item>
      <Form.Item name="category" label="分类" rules={[{required: true}]}>
        <Select options={[{value: 'map', label: '地图'}, {value: 'route', label: '路线'}, {value: 'ui', label: '界面'}]} />
      </Form.Item>
      <Form.Item name="providerHint" label="Provider">
        <Input />
      </Form.Item>
      <Form.Item name="description" label="说明">
        <Input />
      </Form.Item>
      <Form.Item name="version" label="版本">
        <InputNumber min={1} style={{width: '100%'}} />
      </Form.Item>
      <Form.Item name="sortOrder" label="排序">
        <InputNumber min={0} style={{width: '100%'}} />
      </Form.Item>
      <Form.Item name="isDefault" label="设为默认" valuePropName="checked">
        <Switch />
      </Form.Item>
      <Form.Item name="isActive" label="启用" valuePropName="checked">
        <Switch />
      </Form.Item>
      <Form.Item name="payload" label="Payload JSON" className="json-field" rules={[{required: true}]}>
        <Input.TextArea rows={8} />
      </Form.Item>
    </>
  );
}
