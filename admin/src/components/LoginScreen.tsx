/**
 * 管理后台登录页面
 *
 * 提供用户名/密码表单，登录成功后通过 onLogin 回调传递管理员信息
 */

import {useState, type ReactElement} from 'react';
import {SafetyCertificateOutlined} from '@ant-design/icons';
import {App as AntApp, Button, Form, Input, Typography} from 'antd';
import {login, type AdminProfile} from '../api/admin';

/** 登录屏幕组件，登录成功后调用 onLogin(profile) 通知父组件 */
export function LoginScreen({onLogin}: {onLogin: (profile: AdminProfile) => void}): ReactElement {
  const {message} = AntApp.useApp();
  const [loading, setLoading] = useState(false);

  async function handleFinish(values: {username: string; password: string}): Promise<void> {
    setLoading(true);
    try {
      const profile = await login(values.username, values.password);
      onLogin(profile);
      message.success('已进入管理后台');
    } catch (err) {
      message.error((err as Error).message || '登录失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-login">
      <div className="admin-login-panel">
        <div className="admin-brand-mark">
          <SafetyCertificateOutlined />
        </div>
        <h1 className="admin-login-title">TraceCraft Admin</h1>
        <Typography.Paragraph type="secondary">
          使用后端管理 API 登录。本地默认口令来自 `TRACECRAFT_ADMIN_PASSWORD`。
        </Typography.Paragraph>
        <Form layout="vertical" size="large" onFinish={handleFinish} initialValues={{username: 'admin'}}>
          <Form.Item name="username" label="用户名" rules={[{required: true, message: '请输入用户名'}]}>
            <Input autoComplete="username" />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{required: true, message: '请输入密码'}]}>
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            登录
          </Button>
        </Form>
      </div>
      <div className="admin-login-art">
        <div className="admin-login-copy">运营数据、内容审核、模板配置集中处理。</div>
        <div className="admin-login-note">MVP 管理端。上线前需接入真实密码哈希、会话过期和权限矩阵。</div>
      </div>
    </div>
  );
}
