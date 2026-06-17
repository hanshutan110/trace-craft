/**
 * TraceCraft 后台管理面板
 *
 * 当前通过后端 API 读写 PostgreSQL。
 * 三大管理模块：
 *   1. 用户管理（users）—— 增删改查、角色分配、启用/禁用
 *   2. 内容管理（contents）—— 公告/FAQ/帮助/政策，草稿/发布/归档
 *   3. 模板管理（templates）—— 地图/路线/UI 模板，启用/禁用/设为默认
 *
 */

const API_BASE = (window.TRACECRAFT_API_BASE || 'http://localhost:3001/api').replace(/\/$/, '');

// ===== 工具函数 =====

/** 深拷贝对象 */
function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

// ===== 各模块配置（搜索字段、状态选项、标签等） =====
const moduleConfig = {
  users: {
    label: 'Users',
    singular: 'User',
    stateKey: 'users',
    createText: 'Add User',
    searchPlaceholder: 'Search username / name / phone / email',
    searchFields: ['username', 'name', 'phone', 'email'],
    statusText: (status) => ({active: 'Active', disabled: 'Disabled', locked: 'Locked'})[status] || status,
    statusClass: (status) => ({active: 'active', disabled: 'disabled', locked: 'locked'})[status] || '',
    statusOptions: [
      {value: '', label: 'All'},
      {value: 'active', label: 'Active'},
      {value: 'disabled', label: 'Disabled'},
      {value: 'locked', label: 'Locked'},
    ],
  },
  contents: {
    label: 'Content',
    singular: 'Content',
    stateKey: 'contents',
    createText: 'Add Content',
    searchPlaceholder: 'Search title / key / summary',
    searchFields: ['key', 'title', 'summary'],
    statusText: (status) => ({draft: 'Draft', published: 'Published', archived: 'Archived'})[status] || status,
    statusClass: (status) => ({draft: 'disabled', published: 'active', archived: 'locked'})[status] || '',
    statusOptions: [
      {value: '', label: 'All'},
      {value: 'draft', label: 'Draft'},
      {value: 'published', label: 'Published'},
      {value: 'archived', label: 'Archived'},
    ],
  },
  templates: {
    label: 'Templates',
    singular: 'Template',
    stateKey: 'templates',
    createText: 'Add Template',
    searchPlaceholder: 'Search code / name / category',
    searchFields: ['code', 'name', 'category', 'description'],
    statusText: (status) => (status ? 'Enabled' : 'Disabled'),
    statusClass: (status) => (status ? 'active' : 'disabled'),
    statusOptions: [
      {value: '', label: 'All'},
      {value: 'active', label: 'Enabled'},
      {value: 'disabled', label: 'Disabled'},
    ],
    isTemplate: true,
  },
};

// ===== 全局状态 =====
let state = {users: [], roleLibrary: [], contents: [], templates: []};
// 当前选中的管理模块
let currentModule = 'users';
// 搜索关键词
let searchKeyword = '';
// 状态筛选条件
let filterStatus = '';
// 弹窗状态
let modalState = {open: false, module: 'users', mode: 'create', editingId: ''};

// ===== API 数据服务层 =====
const service = {
  /** 查询列表 */
  async list(moduleKey) {
    const response = await fetch(`${API_BASE}/admin/${moduleKey}`);
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload.error || 'admin_list_failed');
    return clone(payload.rows || []);
  },
  /** 创建记录 */
  async create(moduleKey, payload) {
    const response = await fetch(`${API_BASE}/admin/${moduleKey}`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || 'admin_create_failed');
    return clone(data.record);
  },
  /** 更新记录 */
  async update(moduleKey, id, payload) {
    const response = await fetch(`${API_BASE}/admin/${moduleKey}/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || 'admin_update_failed');
    return clone(data.record);
  },
  /** 删除记录 */
  async remove(moduleKey, id) {
    const response = await fetch(`${API_BASE}/admin/${moduleKey}/${encodeURIComponent(id)}`, {method: 'DELETE'});
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || 'admin_remove_failed');
    return Boolean(data.removed);
  },
};

async function reloadState() {
  const [users, roleLibrary, contents, templates] = await Promise.all([
    service.list('users'),
    service.list('roleLibrary'),
    service.list('contents'),
    service.list('templates'),
  ]);
  state = {users, roleLibrary, contents, templates};
}

// ===== DOM 工具函数 =====

/**
 * 轻量级 DOM 构建器
 * 简化动态创建 DOM 元素的代码
 * 支持 className、事件绑定（on*）、属性设置
 */
function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (key === 'className') {
      node.className = value || '';
      return;
    }
    if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value);
      return;
    }
    if (value !== undefined && value !== null) {
      node.setAttribute(key, value);
    }
  });
  if (!Array.isArray(children)) {
    children = [children];
  }
  children.forEach((child) => {
    if (child == null) {
      return;
    }
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  });
  return node;
}

// ===== 渲染逻辑 =====

/** 获取当前模块的配置 */
function currentConfig() {
  return moduleConfig[currentModule];
}

/** 获取当前模块的过滤后列表（搜索 + 状态筛选） */
function getCurrentList() {
  const cfg = currentConfig();
  const source = state[cfg.stateKey] || [];
  return source.filter((item) => {
    const kw = searchKeyword.trim().toLowerCase();
    const target = cfg.searchFields.map((k) => String(item[k] || '')).join(' ').toLowerCase();
    const hitKeyword = !kw || target.includes(kw);
    if (!hitKeyword) return false;

    if (!filterStatus) return true;
    if (cfg.isTemplate) {
      return filterStatus === 'active' ? item.isActive : !item.isActive;
    }
    return item.status === filterStatus;
  });
}

/** 切换管理模块，重置搜索和筛选 */
function setModule(module) {
  currentModule = module;
  searchKeyword = '';
  filterStatus = '';
  renderShell();
}

/** 渲染整体布局（侧边栏 + 主内容区 + 弹窗） */
function renderShell() {
  const root = document.getElementById('admin-root');
  if (!root) return;

  root.innerHTML = '';

  const layout = el('div', {className: 'layout'});
  const sidebar = el('aside', {className: 'card sidebar'});

  const brand = el('div', {className: 'brand'}, 'TraceCraft Admin Panel');
  sidebar.append(brand);
  Object.entries(moduleConfig).forEach(([key, cfg]) => {
    sidebar.append(
      el(
        'button',
        {
          className: key === currentModule ? 'active' : '',
          onclick: () => setModule(key),
        },
        cfg.label,
      ),
    );
  });
  sidebar.append(el('div', {className: 'helper status-line'}, 'PostgreSQL API mode'));

  const main = el('section', {className: 'card main'});
  main.append(el('div', {id: 'main-body'}));
  layout.append(sidebar, main);
  root.append(layout, buildModal());
  renderMain(main.querySelector('#main-body'));
}

/** 根据当前模块渲染对应的内容区 */
function renderMain(container) {
  if (!container) return;
  if (currentModule === 'users') {
    renderUsers(container);
  } else if (currentModule === 'contents') {
    renderContents(container);
  } else {
    renderTemplates(container);
  }
}

/** 渲染工具栏（标题、搜索、筛选、新建、重置按钮） */
function renderToolbar(buttonText, onAdd) {
  const cfg = currentConfig();
  return el('div', {className: 'toolbar'}, [
    el('div', {}, [
      el('h1', {}, cfg.label),
      el('div', {className: 'status-line'}, `Total ${getCurrentList().length} rows`),
    ]),
    el('div', {className: 'actions'}, [
      el('input', {
        placeholder: cfg.searchPlaceholder,
        value: searchKeyword,
        oninput: (e) => {
          searchKeyword = e.target.value;
          renderMain(document.getElementById('main-body'));
        },
      }),
      el(
        'select',
        {
          onchange: (e) => {
            filterStatus = e.target.value || '';
            renderMain(document.getElementById('main-body'));
          },
        },
        cfg.statusOptions.map((item) =>
          el('option', {value: item.value, selected: item.value === filterStatus}, item.label),
        ),
      ),
      el(
        'button',
        {
          className: 'btn btn-primary',
          onclick: onAdd,
        },
        buttonText,
      ),
      el(
        'button',
        {
          className: 'btn btn-muted',
          onclick: async () => {
            await reloadState();
            renderMain(document.getElementById('main-body'));
          },
        },
        'Reload',
      ),
    ]),
  ]);
}

/** 渲染用户管理表格 */
function renderUsers(container) {
  const list = getCurrentList();
  const cfg = currentConfig();

  const table = el('table');
  const thead = el('thead', {}, el('tr', {}, [
    el('th', {}, 'Username'),
    el('th', {}, 'Name / Contact'),
    el('th', {}, 'Roles'),
    el('th', {}, 'Status'),
    el('th', {}, 'Updated At'),
    el('th', {}, 'Actions'),
  ]));

  const rows = list.map((item) => {
    const roleNodes = item.roles.map((code) => {
      const role = state.roleLibrary.find((r) => r.code === code);
      return el('span', {className: 'chip'}, role ? role.name : code);
    });
    return el('tr', {}, [
      el('td', {}, item.username),
      el('td', {}, [
        el('div', {}, item.name),
        el('div', {className: 'helper'}, `${item.phone || '-'} / ${item.email || '-'}`),
      ]),
      el('td', {}, roleNodes),
      el('td', {}, el('span', {className: `tag ${cfg.statusClass(item.status)}`}, cfg.statusText(item.status))),
      el('td', {}, new Date(item.updatedAt).toLocaleString()),
      el('td', {}, [
        el('button', {className: 'btn btn-muted', onclick: () => openModal('users', 'edit', item.id)}, 'Edit'),
        el(
          'button',
          {
            className: 'btn btn-primary',
            onclick: async () => {
              const next = item.status === 'active' ? 'disabled' : 'active';
              await service.update('users', item.id, {status: next});
              state.users = await service.list('users');
              renderMain(document.getElementById('main-body'));
            },
          },
          item.status === 'active' ? 'Disable' : 'Enable',
        ),
        el('button', {className: 'btn btn-danger', onclick: () => removeItem('users', item.id)}, 'Delete'),
      ]),
    ]);
  });

  const tbody = el('tbody');
  tbody.append(...rows);
  table.append(thead, tbody);

  container.innerHTML = '';
  container.append(
    renderToolbar(cfg.createText, () => openModal('users', 'create')),
    el('div', {className: 'table-wrap'}, table),
  );
}

/** 渲染内容管理表格 */
function renderContents(container) {
  const list = getCurrentList();
  const cfg = currentConfig();
  const table = el('table');
  const thead = el('thead', {}, el('tr', {}, [
    el('th', {}, 'Key'),
    el('th', {}, 'Type'),
    el('th', {}, 'Title'),
    el('th', {}, 'Summary'),
    el('th', {}, 'Status'),
    el('th', {}, 'Updated At'),
    el('th', {}, 'Actions'),
  ]));

  const rows = list.map((item) => {
    return el('tr', {}, [
      el('td', {}, item.key),
      el('td', {}, item.type),
      el('td', {}, item.title),
      el('td', {}, item.summary),
      el('td', {}, el('span', {className: `tag ${cfg.statusClass(item.status)}`}, cfg.statusText(item.status))),
      el('td', {}, new Date(item.updatedAt).toLocaleString()),
      el('td', {}, [
        el('button', {className: 'btn btn-muted', onclick: () => openModal('contents', 'edit', item.id)}, 'Edit'),
        el(
          'button',
          {
            className: 'btn btn-primary',
            onclick: async () => {
              const next =
                item.status === 'draft' ? 'published' : item.status === 'published' ? 'archived' : 'draft';
              await service.update('contents', item.id, {status: next});
              state.contents = await service.list('contents');
              renderMain(document.getElementById('main-body'));
            },
          },
          item.status === 'published' ? 'Archive' : 'Publish',
        ),
        el('button', {className: 'btn btn-danger', onclick: () => removeItem('contents', item.id)}, 'Delete'),
      ]),
    ]);
  });

  const tbody = el('tbody');
  tbody.append(...rows);
  table.append(thead, tbody);

  container.innerHTML = '';
  container.append(
    renderToolbar(cfg.createText, () => openModal('contents', 'create')),
    el('div', {className: 'table-wrap'}, table),
  );
}

/** 渲染模板管理表格 */
function renderTemplates(container) {
  const list = getCurrentList();
  const cfg = currentConfig();
  const table = el('table');
  const thead = el('thead', {}, el('tr', {}, [
    el('th', {}, 'Code'),
    el('th', {}, 'Name'),
    el('th', {}, 'Category'),
    el('th', {}, 'Status'),
    el('th', {}, 'Default'),
    el('th', {}, 'Version'),
    el('th', {}, 'Updated At'),
    el('th', {}, 'Actions'),
  ]));

  const rows = list.map((item) => {
    return el('tr', {}, [
      el('td', {}, item.code),
      el('td', {}, item.name),
      el('td', {}, item.category),
      el('td', {}, el('span', {className: `tag ${cfg.statusClass(item.isActive)}`}, cfg.statusText(item.isActive))),
      el('td', {}, item.isDefault ? 'Yes' : '-'),
      el('td', {}, `v${item.version || 1}`),
      el('td', {}, new Date(item.updatedAt).toLocaleString()),
      el('td', {}, [
        el('button', {className: 'btn btn-muted', onclick: () => openModal('templates', 'edit', item.id)}, 'Edit'),
        el(
          'button',
          {
            className: 'btn btn-primary',
            onclick: async () => {
              const next = !item.isDefault;
              if (next) {
                state.templates = state.templates.map((row) => ({...row, isDefault: row.id === item.id}));
              }
              await service.update('templates', item.id, {isDefault: next});
              state.templates = await service.list('templates');
              renderMain(document.getElementById('main-body'));
            },
          },
          item.isDefault ? 'Unset Default' : 'Set Default',
        ),
        el(
          'button',
          {
            className: 'btn btn-primary',
            onclick: async () => {
              await service.update('templates', item.id, {isActive: !item.isActive});
              state.templates = await service.list('templates');
              renderMain(document.getElementById('main-body'));
            },
          },
          item.isActive ? 'Disable' : 'Enable',
        ),
        el('button', {className: 'btn btn-danger', onclick: () => removeItem('templates', item.id)}, 'Delete'),
      ]),
    ]);
  });

  const tbody = el('tbody');
  tbody.append(...rows);
  table.append(thead, tbody);

  container.innerHTML = '';
  container.append(
    renderToolbar(cfg.createText, () => openModal('templates', 'create')),
    el('div', {className: 'table-wrap'}, table),
  );
}

// ===== 弹窗相关 =====

/** 构建模态弹窗 DOM 结构 */
function buildModal() {
  return el('div', {className: 'modal-mask', id: 'admin-modal-mask'}, [
    el('div', {className: 'modal'}, [
      el('h2', {id: 'admin-modal-title'}),
      el('div', {id: 'admin-modal-form-wrap'}),
      el('div', {className: 'helper', id: 'admin-modal-tip'}),
      el('div', {className: 'footer'}, [
        el('button', {className: 'btn btn-muted', id: 'admin-modal-close', onclick: closeModal}, 'Cancel'),
        el('button', {className: 'btn btn-primary', id: 'admin-modal-save', onclick: saveModal}, 'Save'),
      ]),
    ]),
  ]);
}

/** 构建表单字段（文本框/下拉框/复选框/文本域） */
function buildField(label, name, attrs = {}) {
  const wrap = el('div', {className: 'form-field'});
  const {
    type = 'text',
    required = false,
    placeholder = '',
    options = [],
    value = '',
    readonly = false,
    checked = false,
    rows = 3,
  } = attrs;
  wrap.append(el('label', {for: name}, label));

  if (type === 'textarea') {
    const area = el('textarea', {name, rows});
    area.value = value || '';
    if (placeholder) area.placeholder = placeholder;
    if (required) area.required = true;
    if (readonly) area.readOnly = true;
    wrap.append(area);
    return wrap;
  }
  if (type === 'select') {
    const sel = el('select', {name});
    options.forEach((item) => sel.append(el('option', {value: item.value, selected: item.value === value}, item.label)));
    wrap.append(sel);
    return wrap;
  }
  if (type === 'checkbox') {
    const chk = el('input', {type: 'checkbox', name});
    chk.checked = Boolean(checked);
    wrap.append(chk);
    return wrap;
  }

  const input = el('input', {type, name, value: value || '', placeholder});
  if (required) input.required = true;
  if (readonly) input.readOnly = true;
  wrap.append(input);
  return wrap;
}

/** 构建角色选择器（复选框组） */
function buildRoleEditor(selected = []) {
  const wrap = el('div', {className: 'form-field'});
  wrap.append(el('label', {}, 'Roles'));
  const holder = el('div');
  state.roleLibrary.forEach((item) => {
    const label = el('label', {className: 'chip'});
    const checkbox = el('input', {
      type: 'checkbox',
      className: 'role-checkbox',
      value: item.code,
      checked: selected.includes(item.code),
    });
    label.append(checkbox, ` ${item.name}`);
    holder.append(label, document.createTextNode(' '));
  });
  wrap.append(holder);
  return wrap;
}

/** 根据模块类型生成对应的表单字段 */
function renderFormByModule(module, item) {
  const rows = [];
  if (module === 'users') {
    rows.push(
      buildField('Username', 'username', {required: true, value: item.username || ''}),
      buildField('Name', 'name', {required: true, value: item.name || ''}),
      buildField('Phone', 'phone', {value: item.phone || ''}),
      buildField('Email', 'email', {type: 'email', value: item.email || ''}),
      buildField('Status', 'status', {
        type: 'select',
        value: item.status || 'active',
        options: [
          {value: 'active', label: 'Active'},
          {value: 'disabled', label: 'Disabled'},
          {value: 'locked', label: 'Locked'},
        ],
      }),
      buildRoleEditor(item.roles || []),
    );
  }

  if (module === 'contents') {
    rows.push(
      buildField('Content Key', 'key', {required: true, value: item.key || ''}),
      buildField('Type', 'type', {
        type: 'select',
        value: item.type || 'announcement',
        options: [
          {value: 'announcement', label: 'Announcement'},
          {value: 'faq', label: 'FAQ'},
          {value: 'help', label: 'Help'},
          {value: 'policy', label: 'Policy'},
        ],
      }),
      buildField('Title', 'title', {required: true, value: item.title || ''}),
      buildField('Summary', 'summary', {value: item.summary || ''}),
      buildField('Body', 'body', {type: 'textarea', rows: 4, value: item.body || ''}),
      buildField('Sort Order', 'sortOrder', {type: 'number', value: item.sortOrder ?? 0}),
      buildField('Status', 'status', {
        type: 'select',
        value: item.status || 'draft',
        options: [
          {value: 'draft', label: 'Draft'},
          {value: 'published', label: 'Published'},
          {value: 'archived', label: 'Archived'},
        ],
      }),
    );
  }

  if (module === 'templates') {
    rows.push(
      buildField('Template Code', 'code', {required: true, value: item.code || ''}),
      buildField('Template Name', 'name', {required: true, value: item.name || ''}),
      buildField('Category', 'category', {
        type: 'select',
        value: item.category || 'map',
        options: [
          {value: 'map', label: 'Map'},
          {value: 'route', label: 'Route'},
          {value: 'ui', label: 'UI'},
        ],
      }),
      buildField('Provider', 'providerHint', {value: item.providerHint || 'amap'}),
      buildField('Version', 'version', {type: 'number', value: item.version ?? 1}),
      buildField('Sort Order', 'sortOrder', {type: 'number', value: item.sortOrder ?? 0}),
      buildField('Description', 'description', {value: item.description || ''}),
      buildField('Is Default', 'isDefault', {type: 'checkbox', checked: Boolean(item.isDefault)}),
      buildField('Is Active', 'isActive', {type: 'checkbox', checked: item.isActive !== false}),
      buildField('Payload JSON', 'payload', {type: 'textarea', rows: 5, value: item.payload || '{}'}),
    );
  }

  return rows;
}

/** 打开弹窗（新建/编辑模式） */
function openModal(module, mode, id = '') {
  const wrap = document.getElementById('admin-modal-form-wrap');
  const title = document.getElementById('admin-modal-title');
  const tip = document.getElementById('admin-modal-tip');
  const cfg = moduleConfig[module];
  const list = state[cfg.stateKey];
  const item = list.find((row) => row.id === id) || {};

  modalState = {open: true, module, mode, editingId: id};
  title.textContent = `${mode === 'create' ? 'Create' : 'Edit'} ${cfg.singular}`;
  tip.textContent = `This form writes to PostgreSQL through the backend API.`
;
  const form = el('form', {id: 'admin-modal-form'});
  renderFormByModule(module, item).forEach((node) => form.append(node));
  wrap.innerHTML = '';
  wrap.append(form);
  document.getElementById('admin-modal-mask').classList.add('show');
}

/** 关闭弹窗 */
function closeModal() {
  const mask = document.getElementById('admin-modal-mask');
  const wrap = document.getElementById('admin-modal-form-wrap');
  if (mask) mask.classList.remove('show');
  if (wrap) wrap.innerHTML = '';
}

/** 读取表单数据并校验，返回 null 表示校验失败 */
function readFormPayload() {
  const module = modalState.module;
  const form = document.getElementById('admin-modal-form');
  if (!form) return null;
  const cfg = moduleConfig[module];
  const raw = new FormData(form);
  const values = {};
  for (const [key, value] of raw.entries()) {
    if (key.startsWith('role-')) continue;
    values[key] = value;
  }

  if (module === 'users') {
    values.roles = [...form.querySelectorAll('.role-checkbox')]
      .filter((el) => el.checked)
      .map((el) => el.value);
    if (!values.username) {
      alert('Username is required');
      return null;
    }
    if (!values.name) {
      values.name = values.username;
    }
    const duplicate = state.users.some((u) => u.id !== modalState.editingId && u.username === values.username);
    if (duplicate) {
      alert('Username already exists');
      return null;
    }
  }

  if (module === 'contents') {
    if (!values.key) {
      alert('Content key is required');
      return null;
    }
    if (!values.title) {
      alert('Title is required');
      return null;
    }
  }

  if (module === 'templates') {
    if (!values.code) {
      alert('Template code is required');
      return null;
    }
    if (!values.name) {
      alert('Template name is required');
      return null;
    }
    if (!values.payload) {
      values.payload = '{}';
    }
    try {
      JSON.parse(values.payload);
    } catch (_err) {
      alert('Payload must be valid JSON');
      return null;
    }
    values.isDefault = form.querySelector('input[name="isDefault"]')?.checked || false;
    values.isActive = form.querySelector('input[name="isActive"]')?.checked || false;
  }

  if (values.version != null) {
    values.version = Number(values.version) || 1;
  }
  if (values.sortOrder != null) {
    values.sortOrder = Number(values.sortOrder) || 0;
  }

  return values;
}

/** 保存弹窗表单（新建或更新） */
async function saveModal() {
  const module = modalState.module;
  const cfg = moduleConfig[module];
  const payload = readFormPayload();
  if (!payload) return;

  if (modalState.mode === 'create') {
    await service.create(cfg.stateKey, payload);
  } else {
    await service.update(cfg.stateKey, modalState.editingId, payload);
  }
  state[cfg.stateKey] = await service.list(cfg.stateKey);
  closeModal();
  renderMain(document.getElementById('main-body'));
}

/** 删除记录（带确认提示） */
async function removeItem(module, id) {
  const cfg = moduleConfig[module];
  const ok = window.confirm(`Delete this ${cfg.singular.toLowerCase()} ?`);
  if (!ok) return;
  await service.remove(cfg.stateKey, id);
  state[cfg.stateKey] = await service.list(cfg.stateKey);
  renderMain(document.getElementById('main-body'));
}

// ===== 初始化入口 =====
async function init() {
  try {
    await reloadState();
    renderShell();
  } catch (err) {
    const root = document.getElementById('admin-root');
    if (root) {
      root.innerHTML = '<div class="card main"><h1>Admin API unavailable</h1><p class="helper">Start TraceCraft backend and refresh this page.</p></div>';
    }
    console.error(err);
  }
}

document.addEventListener('DOMContentLoaded', init);
