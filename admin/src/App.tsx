import {useEffect, useMemo, useState, type ReactElement} from 'react';
import {
  LogoutOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import {
  App as AntApp,
  Button,
  Card,
  Col,
  Drawer,
  Form,
  Input,
  Layout,
  Menu,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import type {ColumnsType, TablePaginationConfig} from 'antd/es/table';
import {
  clearAdminSession,
  createRecord,
  hasAdminSession,
  getMe,
  listModule,
  listRoles,
  removeRecord,
  updateRecord,
  type AdminModule,
  type AdminProfile,
  type AdminUser,
  type ModuleItem,
  type RoleItem,
} from './api/admin';
import {moduleMeta, statusTag} from './adminConfig';
import {LoginScreen} from './components/LoginScreen';
import {ModuleForm} from './components/ModuleForm';

const {Header, Sider, Content} = Layout;

/** 空分页器默认值 */
const emptyPager = {page: 1, limit: 10, total: 0};

/**
 * 管理后台主组件
 *
 * 包含：侧边栏导航、内容列表、搜索过滤、新增/编辑抽屉
 * 支持用户/内容/模板三大模块的统一管理
 */
function App(): ReactElement | null {
  const {message} = AntApp.useApp();
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [booting, setBooting] = useState(hasAdminSession());
  const [module, setModule] = useState<AdminModule>('users');
  const [rows, setRows] = useState<ModuleItem[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [pager, setPager] = useState(emptyPager);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<ModuleItem | null>(null);
  const [form] = Form.useForm();

  const meta = moduleMeta[module];

  /** 并发加载列表数据和角色列表 */
  async function load(next = {page: pager.page, limit: pager.limit}): Promise<void> {
    setLoading(true);
    try {
      const [listResult, roleRows] = await Promise.all([
        listModule(module, {page: next.page, limit: next.limit, keyword, status}),
        listRoles(),
      ]);
      setRows(listResult.rows);
      setRoles(roleRows);
      setPager({page: listResult.page, limit: listResult.limit, total: listResult.total});
    } catch (err) {
      message.error((err as Error).message || '加载失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!hasAdminSession()) {
      setBooting(false);
      return;
    }
    getMe()
      .then(setProfile)
      .catch(() => clearAdminSession())
      .finally(() => setBooting(false));
  }, []);

  useEffect(() => {
    if (profile) {
      void load({page: 1, limit: pager.limit});
    }
  }, [profile, module]);

  /** 根据当前模块动态生成表格列定义 */
  const columns = useMemo<ColumnsType<ModuleItem>>(() => {
    const actionText = module === 'users' ? '禁用' : module === 'contents' ? '归档' : '停用';
    const actionColumn = {
      title: '操作',
      key: 'actions',
      width: 210,
      render: (_: unknown, record: ModuleItem) => (
        <Space>
          <Button size="small" onClick={() => openEdit(record)}>
            编辑
          </Button>
          <Button size="small" danger onClick={() => confirmRemove(record)}>
            {actionText}
          </Button>
        </Space>
      ),
    };

    if (module === 'users') {
      return [
        {title: '用户名', dataIndex: 'username', width: 160},
        {
          title: '姓名 / 联系方式',
          render: (_, record) => {
            const item = record as AdminUser;
            return (
              <>
                <div>{item.name}</div>
                <Typography.Text type="secondary">{item.phone || '-'} / {item.email || '-'}</Typography.Text>
              </>
            );
          },
        },
        {
          title: '角色',
          dataIndex: 'roles',
          render: (values: string[]) => (
            <Space size={[0, 4]} wrap>
              {values.map((code) => <Tag key={code}>{roles.find((r) => r.code === code)?.name || code}</Tag>)}
            </Space>
          ),
        },
        {title: '状态', dataIndex: 'status', width: 100, render: statusTag},
        {title: '更新时间', dataIndex: 'updatedAt', width: 190, render: (v: string) => new Date(v).toLocaleString()},
        actionColumn,
      ];
    }

    if (module === 'contents') {
      return [
        {title: 'Key', dataIndex: 'key', width: 180},
        {title: '类型', dataIndex: 'type', width: 120},
        {title: '标题', dataIndex: 'title'},
        {title: '摘要', dataIndex: 'summary', ellipsis: true},
        {title: '状态', dataIndex: 'status', width: 100, render: statusTag},
        {title: '更新时间', dataIndex: 'updatedAt', width: 190, render: (v: string) => new Date(v).toLocaleString()},
        actionColumn,
      ];
    }

    return [
      {title: '编码', dataIndex: 'code', width: 180},
      {title: '名称', dataIndex: 'name'},
      {title: '分类', dataIndex: 'category', width: 110},
      {title: 'Provider', dataIndex: 'providerHint', width: 120},
      {title: '状态', dataIndex: 'isActive', width: 100, render: statusTag},
      {title: '默认', dataIndex: 'isDefault', width: 90, render: (v: boolean) => (v ? <Tag color="processing">默认</Tag> : '-')},
      {title: '版本', dataIndex: 'version', width: 90, render: (v: number) => `v${v || 1}`},
      actionColumn,
    ];
  }, [module, roles]);

  /** 打开新增表单抽屉，按模块设置默认值 */
  function openCreate(): void {
    setEditing(null);
    form.resetFields();
    if (module === 'contents') {
      form.setFieldsValue({type: 'announcement', status: 'draft', sortOrder: 0});
    }
    if (module === 'templates') {
      form.setFieldsValue({category: 'route', providerHint: 'amap', version: 1, sortOrder: 0, isActive: true, isDefault: false, payload: '{}'});
    }
    if (module === 'users') {
      form.setFieldsValue({status: 'active', roles: []});
    }
    setDrawerOpen(true);
  }

  /** 打开编辑表单抽屉，填充已有数据 */
  function openEdit(record: ModuleItem): void {
    setEditing(record);
    form.resetFields();
    form.setFieldsValue(record);
    setDrawerOpen(true);
  }

  /** 确认删除（禁用/归档/停用）并刷新列表 */
  function confirmRemove(record: ModuleItem): void {
    const actionText = module === 'users' ? '禁用' : module === 'contents' ? '归档' : '停用';
    Modal.confirm({
      title: `确认${actionText}`,
      content: `${actionText}后仍会保留记录和审计日志：${'username' in record ? record.username : 'title' in record ? record.title : record.name}`,
      okText: actionText,
      okButtonProps: {danger: true},
      async onOk() {
        await removeRecord(module, record.id);
        message.success(`已${actionText}`);
        await load();
      },
    });
  }

  /** 保存表单：包含 JSON 校验和密码强度检查 */
  async function saveForm(): Promise<void> {
    const values = await form.validateFields();
    if (module === 'templates') {
      try {
        JSON.parse(values.payload || '{}');
      } catch {
        form.setFields([{ name: 'payload', errors: ['payload 必须是合法 JSON'] }]);
        return;
      }
    }
    if (module === 'users' && !editing && !values.password) {
      form.setFields([{name: 'password', errors: ['请输入至少 10 位初始密码']}]);
      return;
    }
    if (editing) {
      await updateRecord(module, editing.id, values);
      message.success('已更新');
    } else {
      await createRecord(module, values);
      message.success('已创建');
    }
    setDrawerOpen(false);
    await load();
  }

  if (booting) return null;
  if (!profile) return <LoginScreen onLogin={setProfile} />;

  return (
    <Layout className="admin-shell">
      <Sider width={236} className="admin-sider">
        <div className="admin-brand">
          <span className="admin-brand-mark"><SafetyCertificateOutlined /></span>
          TraceCraft Admin
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[module]}
          items={(Object.keys(moduleMeta) as AdminModule[]).map((key) => ({key, icon: moduleMeta[key].icon, label: moduleMeta[key].title}))}
          onClick={(item) => {
            setModule(item.key as AdminModule);
            setKeyword('');
            setStatus('');
          }}
        />
      </Sider>
      <Layout>
        <Header className="admin-header">
          <div>
            <h1 className="admin-page-title">{meta.title}</h1>
            <div className="admin-page-subtitle">{meta.subtitle}</div>
          </div>
          <Space>
            <Tag color="green">{profile.displayName}</Tag>
            <Button
              icon={<LogoutOutlined />}
              onClick={() => {
                clearAdminSession();
                setProfile(null);
              }}
            >
              退出
            </Button>
          </Space>
        </Header>
        <Content className="admin-content">
          <Row gutter={12}>
            <Col span={8}><Card className="admin-stat-card"><Statistic title="当前结果" value={pager.total} /></Card></Col>
            <Col span={8}><Card className="admin-stat-card"><Statistic title="当前页" value={pager.page} /></Card></Col>
            <Col span={8}><Card className="admin-stat-card"><Statistic title="角色数" value={roles.length} /></Card></Col>
          </Row>
          <div className="admin-toolbar">
            <div className="admin-toolbar-left">
              <Input.Search
                allowClear
                placeholder="搜索关键字"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onSearch={() => load({page: 1, limit: pager.limit})}
                style={{width: 280}}
              />
              <Select
                allowClear
                placeholder="状态"
                value={status || undefined}
                onChange={(value) => setStatus(value || '')}
                style={{width: 140}}
                options={[
                  {value: 'active', label: '启用'},
                  {value: 'disabled', label: '禁用'},
                  {value: 'locked', label: '锁定'},
                  {value: 'draft', label: '草稿'},
                  {value: 'published', label: '发布'},
                  {value: 'archived', label: '归档'},
                ]}
              />
              <Button onClick={() => load({page: 1, limit: pager.limit})}>筛选</Button>
            </div>
            <div className="admin-toolbar-right">
              <Button icon={<ReloadOutlined />} onClick={() => load()} />
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>{meta.createText}</Button>
            </div>
          </div>
          <Card className="admin-table-card" styles={{body: {padding: 0}}}>
            <Table
              rowKey="id"
              loading={loading}
              columns={columns}
              dataSource={rows}
              pagination={{current: pager.page, pageSize: pager.limit, total: pager.total, showSizeChanger: true}}
              onChange={(pagination: TablePaginationConfig) => {
                void load({page: pagination.current || 1, limit: pagination.pageSize || pager.limit});
              }}
            />
          </Card>
        </Content>
      </Layout>
      <Drawer
        width={520}
        title={`${editing ? '编辑' : '新增'}${meta.title}`}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        extra={<Button type="primary" onClick={saveForm}>保存</Button>}
      >
        <Form form={form} layout="vertical">
          <ModuleForm module={module} roles={roles} />
        </Form>
      </Drawer>
    </Layout>
  );
}

export default App;
