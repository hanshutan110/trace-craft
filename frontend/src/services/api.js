const API_BASE = 'http://localhost:3001';

export const createRouteFromImage = async ({ userId, file }) => {
  const formData = new FormData();
  formData.append('userId', userId || 'anonymous');
  formData.append('image', file);

  const res = await fetch(`${API_BASE}/v1/routes/from-image`, {
    method: 'POST',
    body: formData,
  });
  return res.json();
};

export const getMapConfig = async () => {
  const res = await fetch(`${API_BASE}/v1/maps/config`);
  return res.json();
};

export const adjustRoute = async ({ routeId, targetKm }) => {
  const res = await fetch(`${API_BASE}/v1/routes/${routeId}/adjust`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ targetKm }),
  });
  return res.json();
};

export const rebaseRoute = async ({ routeId, startPoint, endPoint, strategy }) => {
  const res = await fetch(`${API_BASE}/v1/routes/${routeId}/rebase`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ startPoint, endPoint, strategy }),
  });
  return res.json();
};

export const startRun = async ({ routeId, userId }) => {
  const res = await fetch(`${API_BASE}/v1/routes/${routeId}/start-run`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  return res.json();
};

export const reportLocation = async ({ sessionId, latitude, longitude, accuracy }) => {
  const res = await fetch(`${API_BASE}/v1/run/${sessionId}/location`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ lat: latitude, lng: longitude, accuracy }),
  });
  return res.json();
};

export const getRunState = async ({ sessionId }) => {
  const res = await fetch(`${API_BASE}/v1/run/${sessionId}/state`);
  return res.json();
};

export const finishRun = async ({ sessionId, actualPath }) => {
  const res = await fetch(`${API_BASE}/v1/run/${sessionId}/finish`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ actualPath }),
  });
  return res.json();
};
