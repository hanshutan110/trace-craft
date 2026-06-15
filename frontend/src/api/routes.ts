import type { GeneratedRoute, GeoPoint } from '../types';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api').replace(/\/$/, '');
const DEMO_USER_TOKEN = 'user:demo';

interface RouteApiPayload {
  ok: boolean;
  route?: GeneratedRoute;
  sessionId?: string;
  session?: { id?: string };
  error?: string;
  code?: string;
}

function authHeaders(extra: HeadersInit = {}): HeadersInit {
  return {
    Authorization: `Bearer ${DEMO_USER_TOKEN}`,
    ...extra,
  };
}

async function parseRouteResponse(response: Response): Promise<GeneratedRoute> {
  const payload = (await response.json()) as RouteApiPayload;
  if (!response.ok || !payload.ok || !payload.route) {
    throw new Error(payload.error || payload.code || 'route_request_failed');
  }
  return payload.route;
}

export async function getCurrentPoint(): Promise<{ point: GeoPoint; accuracy: number | null }> {
  const fallback = { point: { lat: 31.2304, lng: 121.4737 }, accuracy: null };
  if (!navigator.geolocation) return fallback;

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          point: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
          accuracy: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
        });
      },
      () => resolve(fallback),
      {
        enableHighAccuracy: true,
        timeout: 3500,
        maximumAge: 30000,
      },
    );
  });
}

export async function createTemplateRoute(shapeType: string, targetKm: number = 5): Promise<GeneratedRoute> {
  const current = await getCurrentPoint();
  const response = await fetch(`${API_BASE}/routes/from-template`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      shapeType,
      targetKm,
      provider: 'amap',
      startPoint: current.point,
      currentAccuracy: current.accuracy,
    }),
  });
  return parseRouteResponse(response);
}

export async function createImageRoute(file: File, targetKm: number = 5): Promise<GeneratedRoute> {
  const current = await getCurrentPoint();
  const body = new FormData();
  body.append('image', file);
  body.append('targetKm', String(targetKm));
  body.append('provider', 'amap');
  body.append('startPoint', JSON.stringify(current.point));
  if (current.accuracy !== null) {
    body.append('currentAccuracy', String(current.accuracy));
  }

  const response = await fetch(`${API_BASE}/routes`, {
    method: 'POST',
    headers: authHeaders(),
    body,
  });
  return parseRouteResponse(response);
}

export async function startRoute(routeId: string, riskConfirmed: boolean): Promise<string> {
  const response = await fetch(`${API_BASE}/routes/${routeId}/start`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      provider: 'amap',
      riskConfirmed,
    }),
  });
  const payload = (await response.json()) as RouteApiPayload;
  const sessionId = payload.sessionId || payload.session?.id;
  if (!response.ok || !payload.ok || !sessionId) {
    throw new Error(payload.error || payload.code || 'start_route_failed');
  }
  return sessionId;
}
