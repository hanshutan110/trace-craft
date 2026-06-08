(function initTraceCraftDemo() {
  const DEFAULTS = {
    routeDistanceKm: 3,
    speedKmh: 8,
    templateId: 'balanced-loop',
    shapeId: 'wave',
  };

  const STORAGE_KEYS = {
    lastSession: 'tc_last_nav_session',
    navSeed: 'tc_nav_seed',
    routeDraft: 'tc_route_draft',
    templateDraft: 'tc_template_draft',
    runtime: 'tc_runtime_summary',
  };

  const clamp = (v, min, max, fallback) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  };

  const parseNum = (v, fallback = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };

  const clampInt = (v, min, max, fallback) => Math.round(clamp(v, min, max, fallback));

  const fmtTime = (sec = 0) => {
    const s = Math.max(0, Math.floor(sec || 0));
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  };

  const getQuery = () => new URLSearchParams(window.location.search);

  const safeJSON = (raw) => {
    try { return raw ? JSON.parse(raw) : null; } catch (_e) { return null; }
  };

  const getSeed = () => {
    const storage = safeJSON(localStorage.getItem(STORAGE_KEYS.navSeed)) || {};
    const params = getQuery();
    const distance = parseNum(params.get('distance'), null);
    const speed = parseNum(params.get('speed'), null);
    const from = params.get('from') || storage.from;

    return {
      routeDistanceKm: distance > 0 ? distance : parseNum(storage.routeDistanceKm, DEFAULTS.routeDistanceKm),
      speedKmh: speed > 0 ? speed : parseNum(storage.speedKmh, DEFAULTS.speedKmh),
      templateId: params.get('templateId') || storage.templateId || DEFAULTS.templateId,
      shapeId: params.get('shapeId') || storage.shapeId || DEFAULTS.shapeId,
      routeId: storage.routeId || '',
      from: from || 'home',
    };
  };

  const setSeed = (next = {}) => {
    const prev = getSeed();
    const merged = { ...prev, ...next, updatedAt: Date.now() };
    localStorage.setItem(STORAGE_KEYS.navSeed, JSON.stringify(merged));
    return merged;
  };

  const getLastSession = () => safeJSON(localStorage.getItem(STORAGE_KEYS.lastSession));
  const setLastSession = (summary = {}) => {
    const data = { ...summary, updatedAt: Date.now() };
    localStorage.setItem(STORAGE_KEYS.lastSession, JSON.stringify(data));
    return data;
  };

  const getRouteDraft = () => safeJSON(localStorage.getItem(STORAGE_KEYS.routeDraft)) || null;
  const setRouteDraft = (draft = {}) => {
    const data = { ...draft, updatedAt: Date.now() };
    localStorage.setItem(STORAGE_KEYS.routeDraft, JSON.stringify(data));
    return data;
  };

  const getTemplateDraft = () => safeJSON(localStorage.getItem(STORAGE_KEYS.templateDraft)) || null;
  const setTemplateDraft = (draft = {}) => {
    const data = { ...draft, updatedAt: Date.now() };
    localStorage.setItem(STORAGE_KEYS.templateDraft, JSON.stringify(data));
    return data;
  };

  const setRuntimeSummary = (summary = {}) => {
    const data = { ...summary, updatedAt: Date.now() };
    localStorage.setItem(STORAGE_KEYS.runtime, JSON.stringify(data));
    return data;
  };

  const getRuntimeSummary = () => safeJSON(localStorage.getItem(STORAGE_KEYS.runtime));

  const buildNavigationLink = (seed = getSeed()) => {
    const q = new URLSearchParams({
      from: seed.from || 'home',
      distance: String(clamp(seed.routeDistanceKm, 0.3, 20, DEFAULTS.routeDistanceKm)),
      speed: String(clamp(seed.speedKmh, 2, 20, DEFAULTS.speedKmh)),
      templateId: seed.templateId || DEFAULTS.templateId,
      shapeId: seed.shapeId || DEFAULTS.shapeId,
      seed: String(seed.updatedAt || Date.now()),
    });
    return `./navigation.html?${q.toString()}`;
  };

  const buildHomeLink = (seed = getSeed()) => {
    const q = new URLSearchParams({
      from: seed.from || 'any',
      distance: String(clamp(seed.routeDistanceKm, 0.3, 20, DEFAULTS.routeDistanceKm)),
      speed: String(clamp(seed.speedKmh, 2, 20, DEFAULTS.speedKmh)),
      templateId: seed.templateId || DEFAULTS.templateId,
      shapeId: seed.shapeId || DEFAULTS.shapeId,
    });
    return `./index.html?${q.toString()}`;
  };

  const buildPageLink = (url, seed = getSeed(), extra = {}) => {
    const q = new URLSearchParams({
      from: seed.from || 'home',
      distance: String(clamp(seed.routeDistanceKm, 0.3, 20, DEFAULTS.routeDistanceKm)),
      speed: String(clamp(seed.speedKmh, 2, 20, DEFAULTS.speedKmh)),
      templateId: seed.templateId || DEFAULTS.templateId,
      shapeId: seed.shapeId || DEFAULTS.shapeId,
      ...extra,
    });
    return `./${url.replace(/^\//,'')}?${q.toString()}`;
  };

  const buildShareLink = (payload = {}) => {
    const route = normalizeRoute(payload);
    const q = new URLSearchParams({
      route: route.routeId || route.route || '',
      session: route.sessionId || route.session || '',
      distance: String(route.routeDistanceKm.toFixed(2)),
      covered: String(route.actualDistanceKm.toFixed(2)),
      duration: String(route.durationSec || 0),
      speed: String(route.speedKmh || 0),
      deviation: String(route.deviationM || 0),
      from: route.from || 'complete',
    });
    return `./share.html?${q.toString()}`;
  };

  const normalizeRoute = (raw) => {
    const distanceKm = parseNum(raw?.routeDistanceKm, parseNum(raw?.distanceKm, parseNum(raw?.distance, 0)));
    const actualKm = parseNum(raw?.actualDistanceKm, parseNum(raw?.distanceKm, distanceKm));
    const durationSec = parseNum(raw?.durationSec, parseNum(raw?.duration, 0));
    const speed = parseNum(raw?.speedKmh, parseNum(raw?.speed, 0));
    const deviationM = parseNum(raw?.deviationM, parseNum(raw?.deviation, 0));
    return {
      route: raw?.routeId || raw?.route || '',
      session: raw?.sessionId || raw?.session || '',
      routeDistanceKm: distanceKm,
      actualDistanceKm: actualKm,
      durationSec,
      speedKmh: speed,
      deviationM,
      from: raw?.from || 'app',
      source: raw?.source || 'query',
    };
  };

  const initCommonLinks = () => {
    const seed = getSeed();
    const linkMap = [
      ['homeLink', buildHomeLink(seed)],
      ['onboardLink', buildPageLink('/onboard.html', seed)],
      ['templateCenterLink', buildPageLink('/template-center.html', seed)],
      ['routeAdjustLink', buildPageLink('/route-adjust.html', seed)],
      ['routeEditLink', buildPageLink('/route-editor.html', seed)],
      ['routeLoadLink', buildPageLink('/route-load.html', seed)],
      ['goalCompleteLink', buildPageLink('/goal-complete.html', seed)],
      ['navigationLink', buildNavigationLink(seed)],
      ['shareLink', buildShareLink({ ...seed, source: 'common' })],
    ];

    linkMap.forEach(([id, href]) => {
      const el = document.getElementById(id);
      if (el) el.href = href;
    });
  };

  const init = () => {
    window.TC_DEMO = {
      DEFAULTS,
      STORAGE_KEYS,
      clamp,
      clampInt,
      parseNum,
      fmtTime,
      getQuery,
      getSeed,
      setSeed,
      getLastSession,
      setLastSession,
      getRouteDraft,
      setRouteDraft,
      getTemplateDraft,
      setTemplateDraft,
      setRuntimeSummary,
      getRuntimeSummary,
      buildNavigationLink,
      buildHomeLink,
      buildPageLink,
      buildShareLink,
      normalizeRoute,
      initCommonLinks,
    };

    initCommonLinks();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(); 
