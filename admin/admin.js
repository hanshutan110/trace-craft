const STORAGE_KEY = 'tracecraft-admin-mock-db-v2';

function now() {
  return new Date().toISOString();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const DEFAULT_DB = {
  users: [
    {
      id: 'u-001',
      username: 'super_admin',
      name: 'System Admin',
      phone: '13800000001',
      email: 'admin@tracecraft.local',
      roles: ['super_admin'],
      status: 'active',
      updatedAt: now(),
    },
    {
      id: 'u-002',
      username: 'operator01',
      name: 'Operator',
      phone: '13800000002',
      email: 'ops@tracecraft.local',
      roles: ['operator'],
      status: 'disabled',
      updatedAt: now(),
    },
  ],
  roleLibrary: [
    {
      code: 'super_admin',
      name: 'System Admin',
      desc: 'Manage system configuration and permissions',
    },
    {
      code: 'operator',
      name: 'Operator',
      desc: 'Publish content and map configuration',
    },
    {
      code: 'content_editor',
      name: 'Content Editor',
      desc: 'Maintain and edit business content',
    },
  ],
  contents: [
    {
      id: 'c-001',
      key: 'home-banner',
      type: 'announcement',
      title: 'Welcome banner',
      summary: 'Show latest service announcement',
      body: 'Used for system notice and operation reminders.',
      status: 'published',
      sortOrder: 1,
      updatedAt: now(),
    },
    {
      id: 'c-002',
      key: 'faq-collect',
      type: 'faq',
      title: 'FAQ',
      summary: 'Common problem descriptions',
      body: 'Includes common device errors and route anomalies.',
      status: 'draft',
      sortOrder: 2,
      updatedAt: now(),
    },
  ],
  templates: [
    {
      id: 't-001',
      code: 'map-default-cn',
      name: 'Default Map Template',
      category: 'map',
      providerHint: 'amap',
      payload: JSON.stringify(
        {style: 'default', showPoi: true, showTrackHeat: false},
        null,
        2,
      ),
      isDefault: true,
      isActive: true,
      version: 1,
      sortOrder: 1,
      updatedAt: now(),
      description: 'Default map style for daily tracking',
    },
    {
      id: 't-002',
      code: 'route-dark',
      name: 'Dark Route Card',
      category: 'route',
      providerHint: 'amap',
      payload: JSON.stringify(
        {theme: 'dark', trackWidth: 4, labelSize: 'small'},
        null,
        2,
      ),
      isDefault: false,
      isActive: true,
      version: 2,
      sortOrder: 2,
      updatedAt: now(),
      description: 'Dark theme layout for route page',
    },
  ],
};

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

let state = loadState();
let currentModule = 'users';
let searchKeyword = '';
let filterStatus = '';
let modalState = {open: false, module: 'users', mode: 'create', editingId: ''};

const service = {
  async list(moduleKey) {
    await delay(120);
    return clone(state[moduleKey]);
  },
  async create(moduleKey, payload) {
    await delay(160);
    const prefix = moduleKey === 'users' ? 'u' : moduleKey === 'contents' ? 'c' : 't';
    const record = {
      ...payload,
      id: `${prefix}-${Date.now()}`,
      updatedAt: now(),
    };
    state[moduleKey] = [...state[moduleKey], record];
    persistState();
    return clone(record);
  },
  async update(moduleKey, id, payload) {
    await delay(160);
    const list = clone(state[moduleKey]);
    const index = list.findIndex((row) => row.id === id);
    if (index < 0) {
      return null;
    }
    list[index] = {...list[index], ...payload, updatedAt: now()};
    state[moduleKey] = list;
    persistState();
    return clone(list[index]);
  },
  async remove(moduleKey, id) {
    await delay(120);
    const list = clone(state[moduleKey]);
    const index = list.findIndex((row) => row.id === id);
    if (index < 0) {
      return false;
    }
    list.splice(index, 1);
    state[moduleKey] = list;
    persistState();
    return true;
  },
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return clone(DEFAULT_DB);
    }
    const parsed = JSON.parse(raw);
    return {
      ...clone(DEFAULT_DB),
      users: Array.isArray(parsed.users) ? parsed.users : clone(DEFAULT_DB.users),
      roleLibrary: Array.isArray(parsed.roleLibrary) ? parsed.roleLibrary : clone(DEFAULT_DB.roleLibrary),
      contents: Array.isArray(parsed.contents) ? parsed.contents : clone(DEFAULT_DB.contents),
      templates: Array.isArray(parsed.templates) ? parsed.templates : clone(DEFAULT_DB.templates),
    };
  } catch (_err) {
    return clone(DEFAULT_DB);
  }
}

function persistState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

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

function currentConfig() {
  return moduleConfig[currentModule];
}

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

function setModule(module) {
  currentModule = module;
  searchKeyword = '';
  filterStatus = '';
  renderShell();
}

function renderShell() {
  const root = document.getElementById('admin-root');
  if (!root) return;

  root.innerHTML = '';

  const layout = el('div', {className: 'layout'});
  const sidebar = el('aside', {className: 'card sidebar'});

  const brand = el('div', {className: 'brand'}, 'TraceCraft Admin Demo');
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
  sidebar.append(el('div', {className: 'helper status-line'}, 'This page currently uses mock data and can be switched to API later.'));

  const main = el('section', {className: 'card main'});
  main.append(el('div', {id: 'main-body'}));
  layout.append(sidebar, main);
  root.append(layout, buildModal());
  renderMain(main.querySelector('#main-body'));
}

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
          onclick: () => {
            localStorage.removeItem(STORAGE_KEY);
            state = clone(DEFAULT_DB);
            renderMain(document.getElementById('main-body'));
          },
        },
        'Reset Mock Data',
      ),
    ]),
  ]);
}

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

function openModal(module, mode, id = '') {
  const wrap = document.getElementById('admin-modal-form-wrap');
  const title = document.getElementById('admin-modal-title');
  const tip = document.getElementById('admin-modal-tip');
  const cfg = moduleConfig[module];
  const list = state[cfg.stateKey];
  const item = list.find((row) => row.id === id) || {};

  modalState = {open: true, module, mode, editingId: id};
  title.textContent = `${mode === 'create' ? 'Create' : 'Edit'} ${cfg.singular}`;
  tip.textContent = `This form is for local mock data only.`
;
  const form = el('form', {id: 'admin-modal-form'});
  renderFormByModule(module, item).forEach((node) => form.append(node));
  wrap.innerHTML = '';
  wrap.append(form);
  document.getElementById('admin-modal-mask').classList.add('show');
}

function closeModal() {
  const mask = document.getElementById('admin-modal-mask');
  const wrap = document.getElementById('admin-modal-form-wrap');
  if (mask) mask.classList.remove('show');
  if (wrap) wrap.innerHTML = '';
}

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

async function removeItem(module, id) {
  const cfg = moduleConfig[module];
  const ok = window.confirm(`Delete this ${cfg.singular.toLowerCase()} ?`);
  if (!ok) return;
  await service.remove(cfg.stateKey, id);
  state[cfg.stateKey] = await service.list(cfg.stateKey);
  renderMain(document.getElementById('main-body'));
}

function init() {
  renderShell();
}

document.addEventListener('DOMContentLoaded', init);
