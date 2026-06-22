/**
 * TraceCraft 管理后台根组件
 *
 * 核心职责：
 *   1. 登录态校验与侧边栏导航
 *   2. 运营总览面板（指标/待办/动态）
 *   3. 各模块 CRUD（用户/角色/内容/模板/社区/举报/反馈/资产/分享/审计）
 *   4. 批量操作、CSV 导出、数据维护
 */
import {useEffect, useMemo, useState, type ReactElement} from 'react';
import {
  DashboardOutlined,
  DeleteOutlined,
  DownloadOutlined,
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
  Spin,
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
  runMaintenanceCleanup,
  updateRecord,
  type AdminModule,
  type AdminOverview,
  type AdminOverviewTodo,
  type AdminProfile,
  type AdminUser,
  type ModuleItem,
  type RoleItem,
  getOverview,
} from './api/admin';
import {moduleMeta, statusTag} from './adminConfig';
import {LoginScreen} from './components/LoginScreen';
import {ModuleForm} from './components/ModuleForm';

const {Header, Sider, Content} = Layout;
type AdminNavKey = 'overview' | AdminModule;

const emptyPager = {page: 1, limit: 10, total: 0};

/** 将值转为 CSV 安全字符串（转义双引号） */
function csvValue(value: unknown): string {
  const normalized = Array.isArray(value) || (value && typeof value === 'object')
    ? JSON.stringify(value)
    : String(value ?? '');
  return `"${normalized.replace(/"/g, '""')}"`;
}

/** 将当前模块数据导出为 CSV 文件并触发下载 */
function downloadCsv(filename: string, rows: ModuleItem[]): void {
  if (rows.length === 0) return;
  // 直接按当前模块返回字段导出，避免列配置和真实数据字段漂移。
  const fields = Array.from(rows.reduce((set, row) => {
    Object.keys(row).forEach((key) => set.add(key));
    return set;
  }, new Set<string>()));
  const csv = [
    fields.map(csvValue).join(','),
    ...rows.map((row) => fields.map((field) => csvValue((row as unknown as Record<string, unknown>)[field])).join(',')),
  ].join('\r\n');
  const blob = new Blob([`\uFEFF${csv}`], {type: 'text/csv;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** 管理后台主组件 */
function App(): ReactElement | null {
  const {message} = AntApp.useApp();
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [booting, setBooting] = useState(hasAdminSession());
  const [activeKey, setActiveKey] = useState<AdminNavKey>('overview');
  const [module, setModule] = useState<AdminModule>('users');
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  const [rows, setRows] = useState<ModuleItem[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [pager, setPager] = useState(emptyPager);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [batching, setBatching] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<ModuleItem | null>(null);
  const [form] = Form.useForm();

  const isOverview = activeKey === 'overview';
  const meta = isOverview
    ? {title: '运营总览', subtitle: '核心指标、审核待办与最新动态', createText: '', icon: <DashboardOutlined />}
    : moduleMeta[module];
  const readableModules = profile?.readableModules;
  const writableModules = profile?.writableModules;
  const canRead = !readableModules || readableModules.includes(module);
  const canWrite = !writableModules || writableModules.includes(module);
  const visibleModules = readableModules
    ? (Object.keys(moduleMeta) as AdminModule[]).filter((k) => readableModules.includes(k))
    : (Object.keys(moduleMeta) as AdminModule[]);

  async function loadOverview(): Promise<void> {
    setOverviewLoading(true);
    try {
      setOverview(await getOverview());
    } catch (err) {
      message.error((err as Error).message || '总览加载失败');
    } finally {
      setOverviewLoading(false);
    }
  }

  async function load(next = {page: pager.page, limit: pager.limit}): Promise<void> {
    setLoading(true);
    try {
      const [listResult, roleRows] = await Promise.all([
        listModule(module, {page: next.page, limit: next.limit, keyword, status}),
        listRoles(),
      ]);
      setRows(listResult.rows);
      setSelectedRowKeys([]);
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
      if (isOverview) {
        void loadOverview();
      } else {
        void load({page: 1, limit: pager.limit});
      }
    }
  }, [profile, activeKey, module, status]);

  const columns = useMemo<ColumnsType<ModuleItem>>(() => {
    const actionText = module === 'users' ? '禁用' : module === 'contents' ? '归档' : '停用';
    const actionColumn = canWrite ? {
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
    } : null;

    if (module === 'users') {
      return [
        {title: '用户名', dataIndex: 'username', width: 160},
        {
          title: '姓名 / 联系方式',
          render: (_: unknown, record: ModuleItem) => {
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
      ].filter((c): c is NonNullable<typeof c> => !!c);
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
      ].filter((c): c is NonNullable<typeof c> => !!c);
    }

    if (module === 'communityPosts') {
      return [
        {title: 'ID', dataIndex: 'id', width: 160, ellipsis: true},
        {title: '标题', dataIndex: 'title'},
        {title: '作者', dataIndex: 'author', width: 120},
        {title: '状态', dataIndex: 'status', width: 100, render: statusTag},
        {title: '点赞', dataIndex: 'likeCount', width: 80},
        {title: '评论', dataIndex: 'commentCount', width: 80},
        {title: '创建时间', dataIndex: 'createdAt', width: 190, render: (v: string) => v ? new Date(v).toLocaleString() : '-'},
        actionColumn,
      ].filter((c): c is NonNullable<typeof c> => !!c);
    }

    if (module === 'comments') {
      return [
        {title: 'ID', dataIndex: 'id', width: 160, ellipsis: true},
        {title: '帖子ID', dataIndex: 'postId', width: 160, ellipsis: true},
        {title: '作者', dataIndex: 'author', width: 120},
        {title: '内容', dataIndex: 'content', ellipsis: true},
        {title: '创建时间', dataIndex: 'createdAt', width: 190, render: (v: string) => v ? new Date(v).toLocaleString() : '-'},
        actionColumn,
      ].filter((c): c is NonNullable<typeof c> => !!c);
    }

    if (module === 'reports') {
      return [
        {title: 'ID', dataIndex: 'id', width: 160, ellipsis: true},
        {title: '帖子ID', dataIndex: 'postId', width: 160, ellipsis: true},
        {title: '举报类型', dataIndex: 'reportType', width: 120},
        {title: '原因', dataIndex: 'reason', ellipsis: true},
        {title: '状态', dataIndex: 'status', width: 100, render: statusTag},
        {title: '创建时间', dataIndex: 'createdAt', width: 190, render: (v: string) => v ? new Date(v).toLocaleString() : '-'},
        actionColumn,
      ].filter((c): c is NonNullable<typeof c> => !!c);
    }

    if (module === 'feedback') {
      return [
        {title: 'ID', dataIndex: 'id', width: 160, ellipsis: true},
        {title: '用户ID', dataIndex: 'userId', width: 160, ellipsis: true},
        {title: '分类', dataIndex: 'category', width: 100},
        {title: '内容', dataIndex: 'content', ellipsis: true},
        {title: '状态', dataIndex: 'status', width: 100, render: statusTag},
        {title: '创建时间', dataIndex: 'createdAt', width: 190, render: (v: string) => v ? new Date(v).toLocaleString() : '-'},
        actionColumn,
      ].filter((c): c is NonNullable<typeof c> => !!c);
    }

    if (module === 'assets') {
      return [
        {title: 'ID', dataIndex: 'id', width: 160, ellipsis: true},
        {title: '用户ID', dataIndex: 'userId', width: 160, ellipsis: true},
        {title: '类型', dataIndex: 'assetType', width: 100},
        {title: 'MIME', dataIndex: 'mimeType', width: 120},
        {title: '大小(KB)', dataIndex: 'sizeBytes', width: 100, render: (v: number) => v ? Math.round(v / 1024) : '-'},
        {title: '创建时间', dataIndex: 'createdAt', width: 190, render: (v: string) => v ? new Date(v).toLocaleString() : '-'},
        actionColumn,
      ].filter((c): c is NonNullable<typeof c> => !!c);
    }

    if (module === 'sessions') {
      return [
        {title: 'ID', dataIndex: 'id', width: 160, ellipsis: true},
        {title: '用户ID', dataIndex: 'userId', width: 160, ellipsis: true},
        {title: '路线ID', dataIndex: 'routeId', width: 160, ellipsis: true},
        {title: '状态', dataIndex: 'status', width: 100, render: statusTag},
        {title: '版本', dataIndex: 'version', width: 80, render: (v: number) => `v${v || 1}`},
        {title: '创建时间', dataIndex: 'createdAt', width: 190, render: (v: string) => v ? new Date(v).toLocaleString() : '-'},
        actionColumn,
      ].filter((c): c is NonNullable<typeof c> => !!c);
    }

    if (module === 'roles') {
      return [
        {title: '编码', dataIndex: 'code', width: 160},
        {title: '名称', dataIndex: 'name'},
        {title: '描述', dataIndex: 'description', ellipsis: true},
        {title: '状态', dataIndex: 'status', width: 100, render: statusTag},
        actionColumn,
      ].filter((c): c is NonNullable<typeof c> => !!c);
    }

    if (module === 'shareRecords') {
      return [
        {title: 'ID', dataIndex: 'id', width: 160, ellipsis: true},
        {title: '用户ID', dataIndex: 'userId', width: 160, ellipsis: true},
        {title: '渠道', dataIndex: 'channel', width: 120},
        {title: '路线ID', dataIndex: 'routeId', width: 160, ellipsis: true},
        {title: '创建时间', dataIndex: 'createdAt', width: 190, render: (v: string) => v ? new Date(v).toLocaleString() : '-'},
        actionColumn,
      ].filter((c): c is NonNullable<typeof c> => !!c);
    }

    if (module === 'auditLogs') {
      return [
        {title: 'ID', dataIndex: 'id', width: 160, ellipsis: true},
        {title: '事件类型', dataIndex: 'eventType', width: 140},
        {title: '用户ID', dataIndex: 'userId', width: 160, ellipsis: true},
        {title: '描述', dataIndex: 'description', ellipsis: true},
        {title: '创建时间', dataIndex: 'createdAt', width: 190, render: (v: string) => v ? new Date(v).toLocaleString() : '-'},
        actionColumn,
      ].filter((c): c is NonNullable<typeof c> => !!c);
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
    ].filter((c): c is NonNullable<typeof c> => !!c);
  }, [module, roles, canWrite]);

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

  function openEdit(record: ModuleItem): void {
    setEditing(record);
    form.resetFields();
    form.setFieldsValue(record);
    setDrawerOpen(true);
  }

  function getRecordLabel(record: ModuleItem): string {
    if ('username' in record) return String((record as { username: string }).username);
    if ('title' in record) return String((record as { title: string }).title);
    if ('name' in record) return String((record as { name: string }).name);
    return record.id;
  }

  function confirmRemove(record: ModuleItem): void {
    const actionText = module === 'users' ? '禁用' : module === 'contents' ? '归档' : '停用';
    Modal.confirm({
      title: `确认${actionText}`,
      content: `${actionText}后仍会保留记录和审计日志：${getRecordLabel(record)}`,
      okText: actionText,
      okButtonProps: {danger: true},
      async onOk() {
        try {
          await removeRecord(module, record.id);
          message.success(`已${actionText}`);
          await load();
        } catch (err) {
          message.error((err as Error).message || `${actionText}失败`);
        }
      },
    });
  }

  async function exportCurrentFilter(): Promise<void> {
    setExporting(true);
    try {
      const pageSize = 100;
      const first = await listModule(module, {page: 1, limit: pageSize, keyword, status});
      const allRows = [...first.rows];
      const totalPages = Math.ceil(first.total / pageSize);
      for (let page = 2; page <= totalPages; page += 1) {
        const next = await listModule(module, {page, limit: pageSize, keyword, status});
        allRows.push(...next.rows);
      }
      if (allRows.length === 0) {
        message.info('当前筛选无可导出数据');
        return;
      }
      downloadCsv(`tracecraft-${module}-${new Date().toISOString().slice(0, 10)}.csv`, allRows);
      message.success(`已导出 ${allRows.length} 条记录`);
    } catch (err) {
      message.error((err as Error).message || '导出失败');
    } finally {
      setExporting(false);
    }
  }

  function confirmBatchRemove(): void {
    const actionText = module === 'users' ? '禁用' : module === 'contents' ? '归档' : '停用';
    Modal.confirm({
      title: `确认批量${actionText}`,
      content: `将对 ${selectedRowKeys.length} 条记录执行${actionText}，记录和审计日志会保留。`,
      okText: `批量${actionText}`,
      okButtonProps: {danger: true},
      async onOk() {
        setBatching(true);
        try {
          for (const id of selectedRowKeys) {
            await removeRecord(module, id);
          }
          message.success(`已批量${actionText} ${selectedRowKeys.length} 条`);
          setSelectedRowKeys([]);
          await load();
        } catch (err) {
          message.error((err as Error).message || `批量${actionText}失败`);
        } finally {
          setBatching(false);
        }
      },
    });
  }

  function confirmBatchReview(reviewStatus: 'approved' | 'rejected'): void {
    const actionText = reviewStatus === 'approved' ? '通过' : '驳回';
    Modal.confirm({
      title: `确认批量${actionText}`,
      content: `将对 ${selectedRowKeys.length} 篇社区帖子执行${actionText}审核。`,
      okText: `批量${actionText}`,
      okButtonProps: {danger: reviewStatus === 'rejected'},
      async onOk() {
        setBatching(true);
        try {
          // 复用单条审核接口，保证审计日志和状态流转与编辑抽屉一致。
          for (const id of selectedRowKeys) {
            await updateRecord('communityPosts', id, {
              reviewStatus,
              rejectReason: reviewStatus === 'rejected' ? '批量审核驳回' : '',
            } as Partial<ModuleItem>);
          }
          message.success(`已批量${actionText} ${selectedRowKeys.length} 篇`);
          setSelectedRowKeys([]);
          await load();
        } catch (err) {
          message.error((err as Error).message || `批量${actionText}失败`);
        } finally {
          setBatching(false);
        }
      },
    });
  }

  function openTodo(todo: AdminOverviewTodo): void {
    setModule(todo.module);
    setStatus(todo.status || '');
    setKeyword('');
    setActiveKey(todo.module);
  }

  function confirmCleanup(type: 'location_events' | 'audit_logs'): void {
    const label = type === 'location_events' ? '历史定位明细' : '审计日志';
    Modal.confirm({
      title: `确认清理${label}`,
      content: '只清理超过后端配置保留期的数据。定位清理仅影响已结束会话的明细点，不删除路线和会话快照。',
      okText: '确认清理',
      okButtonProps: {danger: true},
      async onOk() {
        setMaintenanceLoading(true);
        try {
          const result = await runMaintenanceCleanup(type);
          message.success(result.queued ? `已加入清理队列：${result.jobId}` : `清理完成，删除 ${result.removed || 0} 行`);
        } catch (err) {
          message.error((err as Error).message || '清理失败');
        } finally {
          setMaintenanceLoading(false);
        }
      },
    });
  }

  function renderOverview(): ReactElement {
    const metricItems = overview?.metrics || [];
    const todoItems = overview?.todos || [];
    const recentItems = overview?.recent || [];
    return (
      <Spin spinning={overviewLoading}>
        <Row gutter={12}>
          {metricItems.map((item) => (
            <Col span={6} key={item.key}>
              <Card className="admin-stat-card">
                <Statistic title={item.title} value={item.value} />
                {item.trend ? <div className="admin-stat-note">{item.trend}</div> : null}
              </Card>
            </Col>
          ))}
          {metricItems.length === 0 ? (
            <Col span={24}>
              <Card className="admin-table-card">当前账号暂无可读模块。</Card>
            </Col>
          ) : null}
        </Row>
        <Row gutter={12} className="admin-overview-grid">
          <Col span={10}>
            <Card
              className="admin-table-card"
              title="待办"
              extra={<Button size="small" icon={<ReloadOutlined />} onClick={loadOverview} />}
            >
              <Space direction="vertical" size={8} style={{width: '100%'}}>
                {todoItems.map((todo) => (
                  <button className="admin-todo-row" key={todo.key} type="button" onClick={() => openTodo(todo)}>
                    <span>
                      <Tag color={todo.priority === 'high' ? 'error' : todo.priority === 'medium' ? 'warning' : 'default'}>
                        {todo.priority === 'high' ? '高' : todo.priority === 'medium' ? '中' : '低'}
                      </Tag>
                      {todo.title}
                    </span>
                    <strong>{todo.count}</strong>
                  </button>
                ))}
              </Space>
            </Card>
          </Col>
          <Col span={14}>
            <Card className="admin-table-card" title="最新动态">
              <Table
                size="small"
                rowKey={(record) => `${record.module}:${record.id}`}
                pagination={false}
                dataSource={recentItems}
                columns={[
                  {title: '模块', dataIndex: 'module', width: 120, render: (value: AdminModule) => moduleMeta[value]?.title || value},
                  {title: '内容', dataIndex: 'title', ellipsis: true},
                  {title: '状态', dataIndex: 'status', width: 100, render: statusTag},
                  {title: '时间', dataIndex: 'createdAt', width: 180, render: (v: string) => v ? new Date(v).toLocaleString() : '-'},
                ]}
              />
            </Card>
          </Col>
        </Row>
        {profile?.roles.includes('super_admin') ? (
          <Row gutter={12} className="admin-overview-grid">
            <Col span={24}>
              <Card className="admin-table-card" title="数据维护">
                <Space>
                  <Button danger loading={maintenanceLoading} onClick={() => confirmCleanup('location_events')}>
                    清理历史定位明细
                  </Button>
                  <Button danger loading={maintenanceLoading} onClick={() => confirmCleanup('audit_logs')}>
                    清理旧审计日志
                  </Button>
                </Space>
              </Card>
            </Col>
          </Row>
        ) : null}
      </Spin>
    );
  }

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
    setSaving(true);
    try {
      if (editing) {
        await updateRecord(module, editing.id, values);
        message.success('已更新');
      } else {
        await createRecord(module, values);
        message.success('已创建');
      }
      setDrawerOpen(false);
      await load();
    } catch (err) {
      message.error((err as Error).message || '保存失败');
    } finally {
      setSaving(false);
    }
  }

  if (booting) return <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}><Spin size="large" /></div>;
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
          selectedKeys={[activeKey]}
          items={[
            {key: 'overview', icon: <DashboardOutlined />, label: '运营总览'},
            ...visibleModules.map((key) => ({key, icon: moduleMeta[key].icon, label: moduleMeta[key].title})),
          ]}
          onClick={(item) => {
            const key = item.key as AdminNavKey;
            setActiveKey(key);
            if (key !== 'overview') setModule(key);
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
          {isOverview ? renderOverview() : (
            <>
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
                      {value: 'pending', label: '待处理'},
                      {value: 'open', label: '打开'},
                    ]}
                  />
                  <Button onClick={() => load({page: 1, limit: pager.limit})}>筛选</Button>
                </div>
                <div className="admin-toolbar-right">
                  {module === 'communityPosts' ? (
                    <>
                      <Button
                        loading={batching}
                        disabled={!canWrite || selectedRowKeys.length === 0}
                        onClick={() => confirmBatchReview('approved')}
                      >
                        批量通过{selectedRowKeys.length ? ` (${selectedRowKeys.length})` : ''}
                      </Button>
                      <Button
                        danger
                        loading={batching}
                        disabled={!canWrite || selectedRowKeys.length === 0}
                        onClick={() => confirmBatchReview('rejected')}
                      >
                        批量驳回{selectedRowKeys.length ? ` (${selectedRowKeys.length})` : ''}
                      </Button>
                    </>
                  ) : null}
                  <Button icon={<DownloadOutlined />} loading={exporting} onClick={exportCurrentFilter}>
                    导出 CSV
                  </Button>
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    loading={batching}
                    disabled={!canWrite || selectedRowKeys.length === 0}
                    onClick={confirmBatchRemove}
                  >
                    批量处理{selectedRowKeys.length ? ` (${selectedRowKeys.length})` : ''}
                  </Button>
                  <Button icon={<ReloadOutlined />} onClick={() => load()} />
                  <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} disabled={!canWrite}>{meta.createText}</Button>
                </div>
              </div>
              <Card className="admin-table-card" styles={{body: {padding: 0}}}>
                <Table
                  rowKey="id"
                  loading={loading}
                  columns={columns}
                  dataSource={rows}
                  rowSelection={canWrite ? {
                    selectedRowKeys,
                    onChange: (keys) => setSelectedRowKeys(keys.map(String)),
                  } : undefined}
                  pagination={{current: pager.page, pageSize: pager.limit, total: pager.total, showSizeChanger: true}}
                  onChange={(pagination: TablePaginationConfig) => {
                    void load({page: pagination.current || 1, limit: pagination.pageSize || pager.limit});
                  }}
                />
              </Card>
            </>
          )}
        </Content>
      </Layout>
      <Drawer
        width={520}
        title={`${editing ? '编辑' : '新增'}${meta.title}`}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        extra={<Button type="primary" loading={saving} onClick={saveForm}>保存</Button>}
      >
        <Form form={form} layout="vertical">
          <ModuleForm module={module} roles={roles} />
        </Form>
      </Drawer>
    </Layout>
  );
}

export default App;
