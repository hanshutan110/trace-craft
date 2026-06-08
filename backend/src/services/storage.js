const fs = require('fs');
const path = require('path');

const DATA_FILE = process.env.TRACECRAFT_DATA_FILE || path.join(__dirname, '../../data/state.json');

function normalizePoint(point) {
  if (!point || typeof point !== 'object') return null;
  const lat = Number(point.lat);
  const lng = Number(point.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function makeState() {
  return {
    routes: {},
    sessions: {},
    userRuns: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadState() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return makeState();
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw || '{}');
    return {
      routes: parsed.routes || {},
      sessions: parsed.sessions || {},
      userRuns: parsed.userRuns || {},
      createdAt: parsed.createdAt || new Date().toISOString(),
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } catch (e) {
    return makeState();
  }
}

function saveState(state) {
  ensureDir(DATA_FILE);
  const payload = {
    ...state,
    updatedAt: new Date().toISOString(),
  };
  const tmp = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(payload, null, 2), 'utf8');
  fs.renameSync(tmp, DATA_FILE);
}

const memory = loadState();

function save() {
  saveState(memory);
}

function getStore() {
  return {
    routes: memory.routes,
    sessions: memory.sessions,
    userRuns: memory.userRuns,
  };
}

function putRoute(route) {
  memory.routes[route.id] = route;
  if (!memory.userRuns[route.userId]) {
    memory.userRuns[route.userId] = [];
  }
  memory.userRuns[route.userId].unshift(route.id);
  save();
}

function putSession(session) {
  memory.sessions[session.id] = session;
  save();
}

function listUserRunIds(userId) {
  return memory.userRuns[userId] || [];
}

function getRoute(routeId) {
  return memory.routes[routeId] || null;
}

function getSession(sessionId) {
  return memory.sessions[sessionId] || null;
}

function normalizePoints(points) {
  if (!Array.isArray(points)) return [];
  return points
    .map(normalizePoint)
    .map((p) => ({ lat: p.lat, lng: p.lng, ts: Date.now() }))
    .filter(Boolean);
}

module.exports = {
  normalizePoint,
  getStore,
  putRoute,
  putSession,
  listUserRunIds,
  getRoute,
  getSession,
  normalizePoints,
};

